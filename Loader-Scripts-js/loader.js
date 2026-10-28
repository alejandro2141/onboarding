(function () {
    // 1. Obtener la etiqueta <script> actual para leer los atributos data-*
    const currentScript = document.currentScript || (function() {
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    })();

    // Leer los parámetros enviados por el tercero
    const mode = currentScript.getAttribute('data-mode') || 'embed';
    const iconText = currentScript.getAttribute('data-icon-text') || 'Asistente IA para Nuevos funcionarios';
    const api = currentScript.getAttribute('data-api') || 'http://192.168.1.19:9001/api/chat';
    //const institution = currentScript.getAttribute('data-institution') || 'bchile';
    //const session = currentScript.getAttribute('data-session') || 'testing22';
    const institution = currentScript.getAttribute('data-institution') ;
    const session = currentScript.getAttribute('data-session') ;
    const title = currentScript.getAttribute('data-title') || 'Asistente Institución';
    const placeholder = currentScript.getAttribute('data-placeholder') || 'Escribe tu consulta...';

    // 2. Inyectar estilos CSS dinámicamente
    const style = document.createElement('style');
    style.innerHTML = `
        .ai-chat-wrapper.mode-icon {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        .ai-chat-trigger-btn {
            background-color: #002464;
            color: #ffffff;
            border: none;
            padding: 12px 18px;
            border-radius: 25px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: transform 0.2s ease;
        }
        .ai-chat-trigger-btn:hover {
            transform: scale(1.03);
        }
        .ai-chat-wrapper.mode-icon .ai-chat-box.is-closed {
            display: none !important;
        }
        .ai-chat-wrapper.mode-icon .ai-chat-box {
            margin-bottom: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        }
    `;
    document.head.appendChild(style);

    // 3. Crear los contenedores HTML requeridos en la página
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-chat-wrapper';

    // Crear el elemento que espera tu ai-chat.js
    const chatContainer = document.createElement('div');
    chatContainer.className = 'ai-chat ai-chat-box';
    chatContainer.setAttribute('data-api', api);
    chatContainer.setAttribute('data-institution', institution);
    chatContainer.setAttribute('data-session', session);
    chatContainer.setAttribute('data-title', title);
    chatContainer.setAttribute('data-placeholder', placeholder);

    if (mode === 'icon') {
        wrapper.classList.add('mode-icon');
        chatContainer.classList.add('is-closed');

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'ai-chat-trigger-btn';
        toggleBtn.innerHTML = `<span>💬</span> <span>${iconText}</span>`;
        
        toggleBtn.addEventListener('click', function () {
            chatContainer.classList.toggle('is-closed');
        });

        wrapper.appendChild(chatContainer);
        wrapper.appendChild(toggleBtn);
        document.body.appendChild(wrapper);
    } else {
        // Modo embed: insertar en la posición donde se declaró el script
        wrapper.appendChild(chatContainer);
        currentScript.parentNode.insertBefore(wrapper, currentScript);
    }

    // 4. Cargar la API original (ai-chat.js) dinámicamente
    const apiScript = document.createElement('script');
    apiScript.src = 'http://192.168.1.19/scriptInstituciones/ai-chat.js';
    document.body.appendChild(apiScript);
})();



/* *********************************************************************
Eemplo para incluir el chat en una web de terceros. 

Opcion 1
<!-- En cualquier parte de la web del tercero -->
<script src="http://192.168.1.19/scriptInstituciones/loader.js" data-mode="icon" data-icon-text="Asistente IA para Nuevos funcionarios" data-institution="bchile"></script>

OPcion 2
<div style="width: 400px; height: 500px;">
    <!-- Se dibujará justo en este punto de la página -->
    <script src="http://192.168.1.19/scriptInstituciones/loader.js" data-mode="embed" data-institution="bchile"></script>
</div>


************************************************************************ */ 




