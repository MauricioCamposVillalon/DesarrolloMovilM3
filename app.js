// --- 1. CONFIGURACIÓN ---
const URL_BASE = "https://firestore.googleapis.com/v1/projects/entornodesarrollom3/databases/(default)/documents/Usuarios";
let listaUsuarios = [];
let usuarioABorrar = null;

// --- 2. CARGAR DATOS (Optimización: Caché) ---
const obtenerUsuarios = async () => {
    const cuerpo = document.getElementById('cuerpo-tabla');
    const cache = localStorage.getItem('usuarios_v3_cache');
    
    if (cache) {
        listaUsuarios = JSON.parse(cache);
        renderizarTabla();
    } else {
        cuerpo.innerHTML = `<tr><td colspan="2" class="text-center py-10 text-gray-400 animate-pulse font-bold text-xs uppercase">Sincronizando... ⏳</td></tr>`;
    }

    try {
        const res = await fetch(URL_BASE);
        if (!res.ok) throw new Error("Error de conexión");
        const data = await res.json();
        listaUsuarios = data.documents || [];
        localStorage.setItem('usuarios_v3_cache', JSON.stringify(listaUsuarios));
        renderizarTabla();
    } catch (e) { console.error("Fallo de red:", e); }
};

// --- 3. RENDERIZAR TABLA (Diseño Premium) ---
const renderizarTabla = () => {
    const cuerpo = document.getElementById('cuerpo-tabla');
    cuerpo.innerHTML = "";
    if (listaUsuarios.length === 0) {
        cuerpo.innerHTML = `<tr><td colspan="2" class="px-6 py-10 text-center text-gray-400 italic">No hay registros</td></tr>`;
        return;
    }

    listaUsuarios.forEach((doc, index) => {
        const f = doc.fields;
        const nombre = f.Nombre?.stringValue || "Sin Nombre";
        const email = f.email?.stringValue || "---";
        const tel = f.Telefono?.integerValue || "0";

        const esUltimo = index >= listaUsuarios.length - 2;
        const posicionTooltip = esUltimo ? "bottom-full mb-2" : "top-1/2 -translate-y-1/2";

        cuerpo.innerHTML += `
            <tr class="hover:bg-indigo-50/50 transition border-b border-gray-50 group">
                <td class="px-8 py-5 font-bold text-gray-700 flex items-center gap-3">
                    <div class="relative group/tip cursor-help">
                        <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs border-2 border-indigo-200 uppercase">
                            ${nombre.charAt(0)}
                        </div>
                        <div class="absolute left-14 ${posicionTooltip} w-64 bg-slate-900 text-white shadow-2xl rounded-2xl p-4 z-[99] opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-300 transform -translate-x-2 group-hover/tip:translate-x-0 pointer-events-none border border-white/10">
                            <p class="text-[10px] font-black text-indigo-400 mb-1 uppercase tracking-widest">Ficha Cloud</p>
                            <p class="font-bold border-b border-white/10 pb-2 mb-2 text-sm">${nombre}</p>
                            <div class="space-y-1.5 text-[10px] font-semibold opacity-90 uppercase">
                                <p>📧 ${email}</p>
                                <p>📱 +56 ${tel}</p>
                            </div>
                        </div>
                    </div>
                    <span class="tracking-tight">${nombre}</span>
                </td>
                <td class="px-8 py-5 text-right">
                    <button onclick="prepararEdicion('${doc.name}')" class="text-[10px] font-black text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-all uppercase">Editar</button>
                    <button onclick="abrirModalBorrar('${doc.name}')" class="text-[10px] font-black text-red-500 hover:bg-red-100 px-3 py-2 rounded-xl transition-all uppercase">Borrar</button>
                </td>
            </tr>`;
    });
};

// --- 4. GUARDAR (Optimización: Latencia Cero) ---
const guardarCambios = async () => {
    const idActual = document.getElementById('id-documento').value;
    const btn = document.getElementById('btn-guardar');
    const vNombre = document.getElementById('nombre').value.trim();
    const vEmail = document.getElementById('email').value.trim();
    const vTel = document.getElementById('telefono').value.trim();

    if (vTel.length !== 9 || !vTel.startsWith('9')) {
        mostrarNotificacion("Teléfono debe iniciar con 9 y tener 9 dígitos", true);
        return;
    }
    if (!vNombre || !vEmail) {
        mostrarNotificacion("Completa los campos obligatorios", true);
        return;
    }

    btn.innerText = "PROCESANDO...";
    btn.disabled = true;

    const payload = {
        fields: {
            Nombre: { stringValue: vNombre },
            email: { stringValue: vEmail },
            Telefono: { integerValue: vTel },
            direccion: { mapValue: { fields: {
                calle: { stringValue: document.getElementById('calle').value },
                ciudad: { stringValue: document.getElementById('ciudad').value }
            }}}
        }
    };

    try {
        const url = idActual ? `https://firestore.googleapis.com/v1/${idActual}` : URL_BASE;
        const res = await fetch(url, {
            method: idActual ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const nuevoDoc = await res.json();
            if (idActual) {
                const i = listaUsuarios.findIndex(u => u.name === idActual);
                listaUsuarios[i] = nuevoDoc;
            } else {
                listaUsuarios.push(nuevoDoc);
            }
            cerrarEdicion();
            renderizarTabla();
            localStorage.setItem('usuarios_v3_cache', JSON.stringify(listaUsuarios));
            mostrarNotificacion(idActual ? "Actualizado" : "Creado con éxito");
        }
    } catch (e) { mostrarNotificacion("Error de red", true); }
    finally { btn.innerText = "GUARDAR"; btn.disabled = false; }
};

// --- 5. NOTIFICACIONES (Corregido el error de la imagen) ---
const mostrarNotificacion = (mensaje, esError = false) => {
    const toast = document.getElementById('toast-notificacion');
    const msg = document.getElementById('toast-mensaje');
    if (!toast || !msg) return;

    msg.innerText = mensaje;
    toast.classList.remove('border-red-500/50', 'border-white/10');
    toast.classList.add(esError ? 'border-red-500/50' : 'border-white/10');

    toast.classList.remove('translate-x-[150%]');
    setTimeout(() => {
        toast.classList.add('translate-x-[150%]');
    }, 3000); // <-- Aquí estaba el error del punto y coma
};

// --- UTILIDADES ---
const abrirPanel = () => {
    const p = document.getElementById('panel-formulario');
    if(p) p.classList.remove('hidden');
};
const cerrarEdicion = () => {
    const p = document.getElementById('panel-formulario');
    if(p) p.classList.add('hidden');
};
const prepararAlta = () => {
    document.getElementById('id-documento').value = "";
    ['nombre','email','telefono','calle','ciudad'].forEach(id => document.getElementById(id).value = "");
    document.getElementById('titulo-operacion').innerText = "Nuevo Registro";
    abrirPanel();
};
const prepararEdicion = (id) => {
    const u = listaUsuarios.find(u => u.name === id);
    if (!u) return;
    document.getElementById('id-documento').value = id;
    document.getElementById('nombre').value = u.fields.Nombre?.stringValue || "";
    document.getElementById('email').value = u.fields.email?.stringValue || "";
    document.getElementById('telefono').value = u.fields.Telefono?.integerValue || "";
    document.getElementById('calle').value = u.fields.direccion?.mapValue?.fields?.calle?.stringValue || "";
    document.getElementById('ciudad').value = u.fields.direccion?.mapValue?.fields?.ciudad?.stringValue || "";
    document.getElementById('titulo-operacion').innerText = "Editar Registro";
    abrirPanel();
};

const abrirModalBorrar = (id) => { usuarioABorrar = id; document.getElementById('modal-borrar').classList.remove('hidden'); };
const cerrarModalBorrar = () => document.getElementById('modal-borrar').classList.add('hidden');
const confirmarBorrado = async () => {
    listaUsuarios = listaUsuarios.filter(u => u.name !== usuarioABorrar);
    renderizarTabla();
    localStorage.setItem('usuarios_v3_cache', JSON.stringify(listaUsuarios));
    await fetch(`https://firestore.googleapis.com/v1/${usuarioABorrar}`, { method: 'DELETE' });
    cerrarModalBorrar();
    mostrarNotificacion("Eliminado");
};


window.addEventListener('load', () => {
    obtenerUsuarios();
});