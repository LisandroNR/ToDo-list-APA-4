const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ===============================
// CONSTRUCTORES Y PROTOTIPOS
// ===============================

// Constructor de Tarea
function Tarea(titulo, descripcion = "", vencimiento = null, dificultad = 1) {
  if (!titulo || titulo.length > 100) {
    throw new Error("Título obligatorio y debe tener menos de 100 caracteres");
  }

  this.titulo = titulo;
  this.descripcion = descripcion.slice(0, 500);
  this.estado = "pendiente";
  this.fechaCreacion = new Date();
  this.ultimaEdicion = new Date();
  this.vencimiento = vencimiento ? new Date(vencimiento) : null;
  this.dificultad = dificultad;
}

// Métodos del prototipo Tarea
Tarea.prototype.setEstado = function (nuevoEstado) {
  const estadosValidos = ["pendiente", "en curso", "terminada", "cancelada"];
  if (!estadosValidos.includes(nuevoEstado)) {
    throw new Error("Estado inválido");
  }
  this.estado = nuevoEstado;
  this.ultimaEdicion = new Date();
};

Tarea.prototype.setDificultad = function (nuevaDificultad) {
  if (![1, 2, 3].includes(nuevaDificultad)) {
    throw new Error("Dificultad inválida (1=fácil, 2=medio, 3=difícil)");
  }
  this.dificultad = nuevaDificultad;
  this.ultimaEdicion = new Date();
};

Tarea.prototype.getDificultadVisual = function () {
  return "⭐".repeat(this.dificultad);
};

Tarea.prototype.detalle = function () {
  return `
📌 ${this.titulo}
📝 Descripción: ${this.descripcion || "Sin descripción"}
📊 Estado: ${this.estado}
💪 Dificultad: ${this.getDificultadVisual()}
📅 Creación: ${this.fechaCreacion.toLocaleString()}
🛠 Última edición: ${this.ultimaEdicion.toLocaleString()}
⏳ Vencimiento: ${this.vencimiento ? this.vencimiento.toLocaleDateString() : "Sin datos"}
  `.trim();
};

// Constructor de GestorTareas
function GestorTareas() {
  this.tareas = [];
}

// Métodos del prototipo GestorTareas
GestorTareas.prototype.agregarTarea = function (tarea) {
  this.tareas.push(tarea);
};

GestorTareas.prototype.listarTareas = function (filtro = null) {
  return this.tareas.filter((t) => !filtro || t.estado === filtro);
};

GestorTareas.prototype.buscarTareas = function (palabra) {
  return this.tareas.filter((t) =>
    t.titulo.toLowerCase().includes(palabra.toLowerCase())
  );
};

GestorTareas.prototype.getTarea = function (index) {
  return this.tareas[index];
};

// Instancia del gestor
const gestor = new GestorTareas();

// ===============================
// ORDENAMIENTO BONUS
// ===============================
function ordenarTareas(lista, callbackVolver) {
  if (lista.length === 0) {
    console.log("\n⚠️ No hay tareas para mostrar");
    return callbackVolver();
  }

  console.log("\n📊 Ordenar tareas:");
  console.log("1. Por fecha de creación");
  console.log("2. Por vencimiento");
  console.log("3. Alfabéticamente (título)");
  console.log("Enter. Sin ordenar");

  rl.question("\nElige opción de ordenamiento: ", (opcion) => {
    let ordenadas = [...lista];

    if (opcion === "1") {
      ordenadas.sort((a, b) => a.fechaCreacion - b.fechaCreacion);
    } else if (opcion === "2") {
      ordenadas.sort((a, b) => {
        if (!a.vencimiento) return 1;
        if (!b.vencimiento) return -1;
        return a.vencimiento - b.vencimiento;
      });
    } else if (opcion === "3") {
      ordenadas.sort((a, b) => a.titulo.localeCompare(b.titulo));
    }

    mostrarListadoTareas(ordenadas, callbackVolver);
  });
}

// ===============================
// MENÚ PRINCIPAL
// ===============================
function menuPrincipal() {
  console.log("\n📋 MENÚ PRINCIPAL");
  console.log("1. Ver mis tareas");
  console.log("2. Buscar una tarea");
  console.log("3. Agregar una tarea");
  console.log("0. Salir");

  rl.question("\nElige una opción: ", (opcion) => {
    switch (opcion) {
      case "1":
        menuVerTareas();
        break;
      case "2":
        menuBuscarTarea();
        break;
      case "3":
        menuAgregarTarea();
        break;
      case "0":
        console.log("👋 Saliendo...");
        rl.close();
        break;
      default:
        console.log("❌ Opción no válida");
        menuPrincipal();
    }
  });
}

// ===============================
// MENÚ VER TAREAS
// ===============================
function menuVerTareas() {
  console.log("\n📋 VER TAREAS");
  console.log("1. Todas");
  console.log("2. Pendientes");
  console.log("3. En curso");
  console.log("4. Terminadas");
  console.log("0. Volver");

  rl.question("\nElige una opción: ", (opcion) => {
    let filtro = null;
    if (opcion === "2") filtro = "pendiente";
    if (opcion === "3") filtro = "en curso";
    if (opcion === "4") filtro = "terminada";

    if (opcion === "0") return menuPrincipal();

    if (!["1", "2", "3", "4"].includes(opcion)) {
      console.log("❌ Opción no válida");
      return menuVerTareas();
    }

    const lista = gestor.listarTareas(filtro);
    ordenarTareas(lista, menuVerTareas);
  });
}

// ===============================
// LISTADO DE TAREAS
// ===============================
function mostrarListadoTareas(lista, callbackVolver) {
  console.log("\n📋 LISTADO DE TAREAS:");
  lista.forEach((t, i) =>
    console.log(`${i + 1}. ${t.titulo} (${t.estado}) [${t.getDificultadVisual()}]`)
  );
  console.log("0. Volver");

  rl.question("\nElige una tarea para ver detalles o 0 para volver: ", (opcion) => {
    if (opcion === "0") return callbackVolver();

    const index = parseInt(opcion) - 1;
    if (isNaN(index) || index < 0 || index >= lista.length) {
      console.log("❌ Opción no válida");
      return mostrarListadoTareas(lista, callbackVolver);
    }

    menuDetalleTarea(lista[index], callbackVolver);
  });
}

// ===============================
// DETALLE DE TAREA
// ===============================
function menuDetalleTarea(tarea, callbackVolver) {
  console.log("\n📋 DETALLE DE TAREA");
  console.log(tarea.detalle());
  console.log("\nE. Editar tarea");
  console.log("0. Volver");

  rl.question("\nElige una opción: ", (opcion) => {
    if (opcion.toLowerCase() === "e") {
      return menuEditarTarea(tarea, () => menuDetalleTarea(tarea, callbackVolver));
    }
    if (opcion === "0") return callbackVolver();
    console.log("❌ Opción no válida");
    menuDetalleTarea(tarea, callbackVolver);
  });
}

// ===============================
// EDITAR TAREA
// ===============================
function menuEditarTarea(tarea, callbackVolver) {
  console.log("\n✏️ EDITAR TAREA");
  rl.question(`Título (${tarea.titulo}): `, (titulo) => {
    if (titulo.trim() !== "") tarea.titulo = titulo.trim();

    rl.question(`Descripción (${tarea.descripcion}): `, (descripcion) => {
      if (descripcion.trim() !== "") tarea.descripcion = descripcion.slice(0, 500);

      rl.question(`Estado (${tarea.estado}) [pendiente/en curso/terminada/cancelada]: `, (estado) => {
        if (estado.trim() !== "") tarea.setEstado(estado.trim());

        rl.question(`Dificultad (${tarea.dificultad}) [1=fácil, 2=medio, 3=difícil]: `, (dif) => {
          if (dif.trim() !== "") tarea.setDificultad(Number(dif));

          rl.question(`Vencimiento (${tarea.vencimiento ? tarea.vencimiento.toLocaleDateString() : "Sin datos"}): `, (venc) => {
            if (venc.trim() !== "") tarea.vencimiento = new Date(venc);

            tarea.ultimaEdicion = new Date();
            console.log("✅ Tarea actualizada!");
            callbackVolver();
          });
        });
      });
    });
  });
}

// ===============================
// BUSCAR TAREA
// ===============================
function menuBuscarTarea() {
  rl.question("\n🔍 Ingresa palabra clave para buscar: ", (palabra) => {
    const resultados = gestor.buscarTareas(palabra);
    if (resultados.length === 0) {
      console.log("\n⚠️ No se encontraron coincidencias.");
      return menuPrincipal();
    }
    ordenarTareas(resultados, menuPrincipal);
  });
}

// ===============================
// AGREGAR TAREA
// ===============================
function menuAgregarTarea() {
  console.log("\n➕ AGREGAR NUEVA TAREA");

  rl.question("Título: ", (titulo) => {
    rl.question("Descripción (opcional): ", (descripcion) => {
      rl.question("Vencimiento (YYYY-MM-DD o enter para omitir): ", (vencimiento) => {
        rl.question("Dificultad (1=fácil, 2=medio, 3=difícil): ", (dif) => {
          try {
            const tarea = new Tarea(
              titulo,
              descripcion,
              vencimiento || null,
              Number(dif) || 1
            );
            gestor.agregarTarea(tarea);
            console.log("✅ Tarea guardada!");
          } catch (err) {
            console.log("❌ Error: " + err.message);
          }
          menuPrincipal();
        });
      });
    });
  });
}

// ===============================
// INICIO DEL PROGRAMA
// ===============================
menuPrincipal();
