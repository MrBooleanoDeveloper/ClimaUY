(() => {
  "use strict";

  let installPrompt = null;
  let registration = null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isInstalled = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;

  // Detectar disponibilidad de instalación
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallButton();
  });

  function updateInstallButton() {
    const button = document.getElementById("pwaInstallBtn");

    if (!button) return;

    button.hidden = isInstalled();
  }

  // Abrir ventana de instalación
  function openInstaller() {
    const modal = document.getElementById("pwaModal");
    if (!modal) return;

    modal.hidden = false;

    const description = document.getElementById("pwaDescription");

    if (description) {
      description.textContent = isIOS
        ? "En Safari, presioná Compartir y luego Añadir a pantalla de inicio."
        : "Disfrutá ClimaUY directamente desde tu dispositivo.";
    }
  }

  function closeInstaller() {
    const modal = document.getElementById("pwaModal");
    if (modal) modal.hidden = true;
  }

  // Ejecutar instalación
  async function installApp() {
    if (isInstalled()) {
      closeInstaller();
      return;
    }

    if (!installPrompt) {
      alert(isIOS
        ? "Abrí ClimaUY en Safari y seleccioná Compartir → Añadir a pantalla de inicio."
        : "Buscá la opción Instalar aplicación en el menú de tu navegador.");
      return;
    }

    await installPrompt.prompt();

    const result = await installPrompt.userChoice;

    installPrompt = null;

    if (result.outcome === "accepted") {
      closeInstaller();
    }
  }

  // Aplicación instalada
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    closeInstaller();

    const button = document.getElementById("pwaInstallBtn");

    if (button) button.hidden = true;

    console.log("ClimaUY instalado correctamente.");
  });

  // Estado de conexión
  function updateConnection() {
    const status = document.getElementById("pwaOffline");

    if (status) {
      status.hidden = navigator.onLine;
    }

    document.body.classList.toggle("pwa-offline", !navigator.onLine);
  }

  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);

  // Notificación de actualización
  function showUpdate() {
    const update = document.getElementById("pwaUpdate");
    if (update) update.hidden = false;
  }

  async function registerWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      registration = await navigator.serviceWorker.register("/sw.js");

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdate();
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;

        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdate();
          }
        });
      });

      let refreshing = false;

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;

        refreshing = true;
        window.location.reload();
      });

    } catch (error) {
      console.error("Error PWA:", error);
    }
  }

  function applyUpdate() {
    registration?.waiting?.postMessage({
      type: "SKIP_WAITING"
    });
  }

  function init() {
    updateInstallButton();
    updateConnection();

    document.getElementById("pwaInstallBtn")
      ?.addEventListener("click", openInstaller);

    document.getElementById("pwaConfirmInstall")
      ?.addEventListener("click", installApp);

    document.getElementById("pwaClose")
      ?.addEventListener("click", closeInstaller);

    document.getElementById("pwaDismiss")
      ?.addEventListener("click", closeInstaller);

    document.getElementById("pwaUpdateBtn")
      ?.addEventListener("click", applyUpdate);

    registerWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
