document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginToggleBtn = document.getElementById("login-toggle");
  const adminLoginSection = document.getElementById("admin-login-section");
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminLogoutBtn = document.getElementById("admin-logout");
  const adminIdentity = document.getElementById("admin-identity");

  let adminToken = localStorage.getItem("adminToken") || "";
  let adminUser = localStorage.getItem("adminUser") || "";

  const isAdmin = () => Boolean(adminToken);

  function setAdmin(token, user) {
    adminToken = token;
    adminUser = user;
    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminUser", user);
    adminIdentity.textContent = `Logged in as ${user}`;
    adminIdentity.classList.remove("hidden");
    adminLogoutBtn.classList.remove("hidden");
    adminLoginSection.classList.add("hidden");
  }

  function clearAdmin() {
    adminToken = "";
    adminUser = "";
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    adminIdentity.textContent = "";
    adminIdentity.classList.add("hidden");
    adminLogoutBtn.classList.add("hidden");
  }

  function updateAdminUI() {
    if (isAdmin()) {
      adminIdentity.textContent = `Logged in as ${adminUser}`;
      adminIdentity.classList.remove("hidden");
      adminLogoutBtn.classList.remove("hidden");
      adminLoginSection.classList.add("hidden");
      signupForm.querySelector("button[type='submit']").disabled = false;
    } else {
      adminIdentity.classList.add("hidden");
      adminLogoutBtn.classList.add("hidden");
      signupForm.querySelector("button[type='submit']").disabled = true;
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const deleteButton = isAdmin()
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                      : "";
                    return `<li><span class="participant-email">${email}</span> ${deleteButton}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": adminToken ? `Bearer ${adminToken}` : "",
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!isAdmin()) {
      messageDiv.textContent = "Teacher login required to sign up students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": adminToken ? `Bearer ${adminToken}` : "",
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Admin login toggle
  loginToggleBtn.addEventListener("click", () => {
    adminLoginSection.classList.toggle("hidden");
  });

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();
      if (response.ok) {
        setAdmin(result.access_token, result.user);
        messageDiv.textContent = "Login successful. Admin controls are enabled.";
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "Login failed";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      updateAdminUI();
    } catch (error) {
      messageDiv.textContent = "Login request failed";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  adminLogoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    } catch (error) {
      console.warn("Logout request failed", error);
    }
    clearAdmin();
    updateAdminUI();
    fetchActivities();
    messageDiv.textContent = "Logged out.";
    messageDiv.className = "success";
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  });

  updateAdminUI();

  // Initialize app
  fetchActivities();
});
