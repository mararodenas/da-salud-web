
const cfg = window.DASALUD_CONFIG || {};
const menu = document.querySelector(".menu");
const toggle = document.querySelector(".mobile-toggle");

if (toggle && menu) {
  toggle.addEventListener("click", () => {
    menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", menu.classList.contains("open") ? "true" : "false");
  });
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => menu.classList.remove("open")));
}

document.querySelectorAll("[data-access-clients]").forEach(link => {
  link.setAttribute("href", cfg.accessClientsUrl || "acceso-clientes.html");
});

const emailAnchor = document.querySelector("[data-contact-email]");
if (emailAnchor && cfg.contactEmail) {
  emailAnchor.href = "mailto:" + cfg.contactEmail;
  emailAnchor.textContent = cfg.contactEmail;
} else if (emailAnchor) {
  emailAnchor.style.display = "none";
}

const phoneAnchor = document.querySelector("[data-contact-phone]");
if (phoneAnchor && cfg.contactPhone) {
  const clean = cfg.contactPhone.replace(/[^\d+]/g, "");
  phoneAnchor.href = "tel:" + clean;
  phoneAnchor.textContent = cfg.contactPhone;
} else if (phoneAnchor) {
  phoneAnchor.style.display = "none";
}

const linkedin = document.querySelector("[data-linkedin]");
if (linkedin && cfg.linkedinUrl) {
  linkedin.href = cfg.linkedinUrl;
} else if (linkedin) {
  linkedin.style.display = "none";
}

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();

const accessForm = document.querySelector("#access-form");
if (accessForm) {
  accessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const msg = document.querySelector("#access-message");
    if (msg) {
      msg.textContent = "El acceso se conectará a la aplicación de clientes de DA Salud en la próxima etapa.";
      msg.hidden = false;
    }
  });
}
