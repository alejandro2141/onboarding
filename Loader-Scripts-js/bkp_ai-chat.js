/*
 * ================================================================
 * AI CHAT - COMPONENTE JAVASCRIPT MINIMALISTA
 * ================================================================
 *
 * Uso:
 *
 * <div
 *   class="ai-chat"
 *   data-api="http://192.168.1.19:9001/api/chat"
 *   data-institution="bchile"
 *   data-session="testing22">
 * </div>
 *
 * <script src="ai-chat.js"></script>
 *
 * ================================================================
 */

(function () {

    "use strict";


    /* ============================================================
       CONFIGURACIÓN GENERAL
       ============================================================ */

    const DEFAULT_CONFIG = {

        apiUrl:
            "http://192.168.1.19:9001/api/chat",

        title:
            "Asistente IA",

        placeholder:
            "Escribe tu mensaje...",

        initialMessage:
            "Hola, ¿en qué puedo ayudarte?"

    };


    /* ============================================================
       CSS DEL COMPONENTE
       ============================================================ */

    const CSS = `

        .ai-chat-container {

            width: 100%;
            max-width: 500px;
            height: 600px;

            display: flex;
            flex-direction: column;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            background: #ffffff;

            border:
                1px solid #dddddd;

            border-radius: 12px;

            overflow: hidden;

            box-shadow:
                0 4px 15px rgba(0,0,0,0.08);

        }


        .ai-chat-header {

            padding: 14px 18px;

            background: #222222;

            color: #ffffff;

            font-size: 16px;

            font-weight: bold;

        }


        .ai-chat-messages {

            flex: 1;

            padding: 16px;

            overflow-y: auto;

            background: #f7f7f7;

            display: flex;

            flex-direction: column;

            gap: 10px;

        }


        .ai-chat-message {

            max-width: 80%;

            padding: 10px 13px;

            border-radius: 12px;

            font-size: 14px;

            line-height: 1.4;

            word-wrap: break-word;

            white-space: pre-wrap;

        }


        .ai-chat-message.user {

            align-self: flex-end;

            background: #222222;

            color: #ffffff;

            border-bottom-right-radius: 3px;

        }


        .ai-chat-message.assistant {

            align-self: flex-start;

            background: #ffffff;

            color: #222222;

            border:
                1px solid #dddddd;

            border-bottom-left-radius: 3px;

        }


        .ai-chat-message.error {

            align-self: flex-start;

            background: #fff0f0;

            color: #a00000;

            border:
                1px solid #ffcccc;

        }


        .ai-chat-input-container {

            display: flex;

            padding: 10px;

            border-top:
                1px solid #dddddd;

            background: #ffffff;

        }


        .ai-chat-input {

            flex: 1;

            border:
                1px solid #cccccc;

            border-radius: 8px;

            padding: 10px;

            font-size: 14px;

            outline: none;

            min-width: 0;

        }


        .ai-chat-input:focus {

            border-color: #777777;

        }


        .ai-chat-send {

            margin-left: 8px;

            border: none;

            border-radius: 8px;

            padding:
                0 18px;

            background: #222222;

            color: #ffffff;

            cursor: pointer;

            font-size: 14px;

        }


        .ai-chat-send:hover {

            background: #444444;

        }


        .ai-chat-send:disabled {

            background: #aaaaaa;

            cursor: not-allowed;

        }


        .ai-chat-typing {

            align-self: flex-start;

            background: #ffffff;

            border:
                1px solid #dddddd;

            border-radius: 12px;

            padding: 10px 13px;

            color: #777777;

            font-size: 13px;

        }


        .ai-chat-typing-dots span {

            animation:
                ai-chat-blink 1.4s infinite both;

        }


        .ai-chat-typing-dots span:nth-child(2) {

            animation-delay:
                0.2s;

        }


        .ai-chat-typing-dots span:nth-child(3) {

            animation-delay:
                0.4s;

        }


        @keyframes ai-chat-blink {

            0% {
                opacity: 0.2;
            }

            20% {
                opacity: 1;
            }

            100% {
                opacity: 0.2;
            }

        }


        @media (max-width: 600px) {

            .ai-chat-container {

                max-width: 100%;

                height: 100vh;

                border-radius: 0;

            }

        }

    `;


    /* ============================================================
       INSERTAR CSS UNA SOLA VEZ
       ============================================================ */

    function injectCSS() {

        if (
            document.getElementById(
                "ai-chat-styles"
            )
        ) {

            return;

        }


        const style =
            document.createElement("style");

        style.id =
            "ai-chat-styles";

        style.textContent =
            CSS;

        document.head.appendChild(style);

    }



    /* ============================================================
       GENERAR UUID
       ============================================================ */

    function generateUUID() {

        if (
            window.crypto &&
            crypto.randomUUID
        ) {

            return crypto.randomUUID();

        }


        /*
         * Fallback para navegadores antiguos
         */

        return (
            "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
        ).replace(
            /[xy]/g,
            function (c) {

                const r =
                    Math.random() * 16 | 0;

                const v =
                    c === "x"
                        ? r
                        : (r & 0x3 | 0x8);

                return v.toString(16);

            }
        );

    }



    /* ============================================================
       CREAR / OBTENER ID DE CONVERSACIÓN
       ============================================================ */

    function getConversationId(
        storageKey
    ) {

        let id =
            localStorage.getItem(
                storageKey
            );


        if (!id) {

            id =
                generateUUID();

            localStorage.setItem(
                storageKey,
                id
            );

        }


        return id;

    }



    /* ============================================================
       CLASE AI CHAT
       ============================================================ */

    class AIChat {


        constructor(element) {

            this.element =
                element;


            /*
             * Leer configuración desde
             * atributos data-*
             */

            this.config = {

                ...DEFAULT_CONFIG,

                apiUrl:
                    element.dataset.api ||
                    DEFAULT_CONFIG.apiUrl,

                institution:
                    element.dataset.institution ||
                    "default",

                session:
                    element.dataset.session ||
                    "default",

                title:
                    element.dataset.title ||
                    DEFAULT_CONFIG.title,

                placeholder:
                    element.dataset.placeholder ||
                    DEFAULT_CONFIG.placeholder

            };


            /*
             * Clave única para localStorage.
             *
             * Separamos institución y sesión.
             *
             * Ejemplo:
             *
             * ai-chat:bchile:testing22
             */

            this.storagePrefix =
                "ai-chat:" +
                this.config.institution +
                ":" +
                this.config.session;


            /*
             * IDs persistentes
             */

            this.conversationId =
                getConversationId(
                    this.storagePrefix +
                    ":conversation_id"
                );


            this.sessionId =
                getConversationId(
                    this.storagePrefix +
                    ":session_id"
                );


            /*
             * Estado
             */

            this.waiting =
                false;


            /*
             * Crear interfaz
             */

            this.render();


            /*
             * Eventos
             */

            this.bindEvents();


            /*
             * Mensaje inicial
             */

            this.addMessage(
                this.config.initialMessage,
                "assistant"
            );

        }



        /* ========================================================
           RENDER
           ======================================================== */

        render() {

            this.element.innerHTML = `

                <div class="ai-chat-container">

                    <div class="ai-chat-header">
                        ${this.escapeHTML(
                            this.config.title
                        )}
                    </div>


                    <div
                        class="ai-chat-messages">
                    </div>


                    <div
                        class="ai-chat-input-container">

                        <input
                            class="ai-chat-input"
                            type="text"
                            placeholder="${this.escapeHTML(
                                this.config.placeholder
                            )}"
                            autocomplete="off"
                        />


                        <button
                            class="ai-chat-send">
                            Enviar
                        </button>

                    </div>

                </div>

            `;


            this.messagesElement =
                this.element.querySelector(
                    ".ai-chat-messages"
                );


            this.inputElement =
                this.element.querySelector(
                    ".ai-chat-input"
                );


            this.sendButton =
                this.element.querySelector(
                    ".ai-chat-send"
                );

        }



        /* ========================================================
           EVENTOS
           ======================================================== */

        bindEvents() {


            /*
             * Botón enviar
             */

            this.sendButton.addEventListener(
                "click",
                () => {

                    this.sendMessage();

                }
            );


            /*
             * ENTER
             */

            this.inputElement.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        this.sendMessage();

                    }

                }
            );

        }



        /* ========================================================
           AGREGAR MENSAJE
           ======================================================== */

        addMessage(
            text,
            type
        ) {

            const message =
                document.createElement(
                    "div"
                );


            message.className =
                "ai-chat-message " +
                type;


            /*
             * textContent evita XSS
             */

            message.textContent =
                text;


            this.messagesElement.appendChild(
                message
            );


            this.scrollToBottom();

        }



        /* ========================================================
           TYPING
           ======================================================== */

        showTyping() {

            const typing =
                document.createElement(
                    "div"
                );


            typing.className =
                "ai-chat-typing";


            typing.id =
                "ai-chat-typing";


            typing.innerHTML = `

                Pensando
                <span
                    class="ai-chat-typing-dots">

                    <span>.</span>
                    <span>.</span>
                    <span>.</span>

                </span>

            `;


            this.messagesElement.appendChild(
                typing
            );


            this.scrollToBottom();

        }



        hideTyping() {

            const typing =
                this.element.querySelector(
                    "#ai-chat-typing"
                );


            if (typing) {

                typing.remove();

            }

        }



        /* ========================================================
           SCROLL
           ======================================================== */

        scrollToBottom() {

            this.messagesElement.scrollTop =
                this.messagesElement.scrollHeight;

        }



        /* ========================================================
           ENVIAR MENSAJE
           ======================================================== */

        async sendMessage() {


            /*
             * Evitar múltiples requests
             */

            if (this.waiting) {

                return;

            }


            const text =
                this.inputElement.value.trim();


            if (!text) {

                return;

            }


            /*
             * Mostrar mensaje usuario
             */

            this.addMessage(
                text,
                "user"
            );


            /*
             * Limpiar input
             */

            this.inputElement.value =
                "";


            /*
             * Estado ocupado
             */

            this.waiting =
                true;


            this.sendButton.disabled =
                true;

            this.inputElement.disabled =
                true;


            this.showTyping();



            /* ====================================================
               CONSTRUIR REQUEST
               ==================================================== */

            const requestBody = {

                user_input:
                    text,

                user_session_key:
                    this.config.session,

                user_institution_id:
                    this.config.institution,

                user_conversation_id:
                    this.conversationId,

                user_session_id:
                    this.sessionId

            };



            console.log(
                "AI Chat Request:",
                requestBody
            );



            try {


                /* ================================================
                   FETCH
                   ================================================ */

                const response =
                    await fetch(
                        this.config.apiUrl,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    requestBody
                                )

                        }
                    );



                /* ================================================
                   VALIDAR HTTP
                   ================================================ */

                if (!response.ok) {

                    throw new Error(
                        "HTTP " +
                        response.status
                    );

                }



                /* ================================================
                   JSON
                   ================================================ */

                const data =
                    await response.json();


                console.log(
                    "AI Chat Response:",
                    data
                );


                this.hideTyping();



                /* ================================================
                   RESPUESTA
                   ================================================ */

                if (
                    data &&
                    typeof data.text !==
                        "undefined"
                ) {

                    this.addMessage(
                        data.text,
                        "assistant"
                    );

                }
                else {

                    this.addMessage(
                        "El servidor no devolvió una respuesta válida.",
                        "error"
                    );

                }


            }
            catch (error) {


                console.error(
                    "AI Chat Error:",
                    error
                );


                this.hideTyping();


                this.addMessage(
                    "No fue posible comunicarse con el servidor.",
                    "error"
                );


            }
            finally {


                /*
                 * Reactivar controles
                 */

                this.waiting =
                    false;


                this.sendButton.disabled =
                    false;

                this.inputElement.disabled =
                    false;


                this.inputElement.focus();

            }

        }



        /* ========================================================
           ESCAPAR HTML
           ======================================================== */

        escapeHTML(text) {

            const div =
                document.createElement(
                    "div"
                );

            div.textContent =
                text;

            return div.innerHTML;

        }

    }



    /* ============================================================
       INICIALIZAR TODOS LOS CHATS
       ============================================================ */

    function initializeChats() {

        injectCSS();


        const elements =
            document.querySelectorAll(
                ".ai-chat"
            );


        elements.forEach(
            function (element) {

                /*
                 * Evitar inicializar dos veces
                 */

                if (
                    element.dataset.aiChatInitialized
                ) {

                    return;

                }


                element.dataset.aiChatInitialized =
                    "true";


                new AIChat(
                    element
                );

            }
        );

    }



    /* ============================================================
       INICIALIZACIÓN
       ============================================================ */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeChats
        );

    }
    else {

        initializeChats();

    }



    /* ============================================================
       API PÚBLICA
       ============================================================ */

    window.AIChat = {

        init:
            initializeChats

    };


})();

