// =======================================================
// ToDo List - Implementación FUNCIONAL (Node.js)
// Núcleo puro + capa de I/O mínima (impura)
// Requisitos: prompt-sync (ya en tu proyecto)
// =======================================================

// ------------------------------
// 🧱 Utilidades funcionales (puras)
// ------------------------------
const identity = x => x;

const compose = (...fns) => input =>
  fns.reduceRight((acc, fn) => fn(acc), input);

const pipe = (...fns) => input =>
  fns.reduce((acc, fn) => fn(acc), input);

// deepFreeze: inmutabilidad (shallow + anidado)
const deepFreeze = (obj) => {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      deepFreeze(obj[prop]);
    });
  }
  return obj;
};

// Helpers inmutables
const freezeCopy = (o) => deepFreeze({ ...o });
const freezeArrayCopy = (arr) => deepFreeze([...arr]);

// ------------------------------
// 📚 Modelo y validaciones (puro)
// ------------------------------
const ESTADOS = deepFreeze({
  PENDIENTE: "Pendiente",
  EN_CURSO: "En Curso",
  TERMINADA: "Terminada",
  CANCELADA: "Cancelada",
});

const DIFICULTAD = deepFreeze({
  FACIL: "Fácil",
  MEDIO: "Medio",
  DIFICIL: "Difícil",
});

const isNonEmptyString = (s) => typeof s === "string" && s.trim().length > 0;

const validateTitulo = (t) =>
  isNonEmptyString(t) && t.trim().length <= 100
    ? null
    : "Título obligatorio y ≤ 100 caracteres";

const validateDescripcion = (d) =>
  typeof d === "string" && d.length <= 500 ? null : "Descripción ≤ 500 caracteres";

const validateEstado = (e) =>
  Object.values(ESTADOS).includes(e) ? null : "Estado inválido";

const validateDificultad = (dif) =>
  Object.values(DIFICULTAD).includes(dif) ? null : "Dificultad inválida";

const validateDateOrNull = (d) =>
  d === null || d instanceof Date ? null : "Fecha inválida";

// Valida un objeto tarea ya formado (puro)
const validateTask = (task) => {
  const errors = [
    validateTitulo(task.titulo),
    validateDescripcion(task.descripcion),
    validateEstado(task.estado),
    validateDificultad(task.dificultad),
    validateDateOrNull(task.creacion),
    validateDateOrNull(task.ultimaEdicion),
    validateDateOrNull(task.vencimiento),
  ].filter(Boolean);
  return errors.length ? errors : null;
};

// ------------------------------
// 🧪 Creación de tareas (puro)
// - Se inyectan dependencias (env): now() y genId()
// ------------------------------
const normalizeDateInput = (v) => {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

const clampDesc = (d) => (d ? d.slice(0, 500) : "");

const makeTask = (spec, env) => {
  const now = env.now();
  const base = {
    id: env.genId(),
    titulo: spec.titulo.trim(),
    descripcion: clampDesc(spec.descripcion || ""),
    estado: spec.estado || ESTADOS.PENDIENTE,
    creacion: now,
    ultimaEdicion: now,
    vencimiento: normalizeDateInput(spec.vencimiento),
    dificultad: spec.dificultad || DIFICULTAD.FACIL,
  };
  const errors = validateTask(base);
  if (errors) throw new Error(errors.join(" | "));
  return deepFreeze(base);
};

// Agregar tarea a lista (puro)
const addTask = (list, task) => freezeArrayCopy([...list, task]);

// ------------------------------
// ✏️ Actualizaciones (puro, inmutables)
// Cada "setter" devuelve una NUEVA tarea + refresca ultimaEdicion
// ------------------------------
const withEditStamp = (task, now) =>
  freezeCopy({ ...task, ultimaEdicion: now });

const setTitulo = (task, newTitulo, now) => {
  const t = { ...task, titulo: newTitulo.trim() };
  const errors = validateTitulo(t.titulo);
  if (errors) throw new Error(errors);
  return withEditStamp(t, now);
};

const setDescripcion = (task, newDesc, now) => {
  const t = { ...task, descripcion: clampDesc(newDesc || "") };
  const errors = validateDescripcion(t.descripcion);
  if (errors) throw new Error(errors);
  return withEditStamp(t, now);
};

const setEstado = (task, nuevoEstado, now) => {
  const t = { ...task, estado: nuevoEstado };
  const err = validateEstado(t.estado);
  if (err) throw new Error(err);
  return withEditStamp(t, now);
};

const setDificultad = (task, dif, now) => {
  const t = { ...task, dificultad: dif };
  const err = validateDificultad(t.dificultad);
  if (err) throw new Error(err);
  return withEditStamp(t, now);
};

const setVencimiento = (task, v, now) => {
  const t = { ...task, vencimiento: normalizeDateInput(v) };
  const err = validateDateOrNull(t.vencimiento);
  if (err) throw new Error(err);
  return withEditStamp(t, now);
};

// Actualizar una tarea por id con "updater" puro (puro)
const updateTaskById = (list, id, updater, now) =>
  freezeArrayCopy(
    list.map((t) => (t.id === id ? updater(t, now) : t))
  );

// ------------------------------
// 🔎 Filtrado (puro, HOFs)
// ------------------------------
const byEstado = (estado) => (t) => t.estado === estado;

const byTituloIncludes = (q) => {
  const needle = q.trim().toLowerCase();
  return (t) => t.titulo.toLowerCase().includes(needle);
};

const filterTasks = (list, ...predicates) =>
  list.filter((t) => predicates.every((p) => p(t)));

// ------------------------------
// 🔽 Ordenamiento (puro, HOFs)
// ------------------------------
// Utilidades de comparadores
const compareAsc = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const compareBy = (proj) => (x, y) => compareAsc(proj(x), proj(y));
const reverse = (cmp) => (a, b) => -cmp(a, b);

// Criterios
const sortByCreacion = compareBy((t) => t.creacion?.getTime() ?? 0);
const sortByVencimiento = compareBy((t) => t.vencimiento ? t.vencimiento.getTime() : Number.POSITIVE_INFINITY);
const sortByTitulo = compareBy((t) => t.titulo.toLowerCase());

// Ordenar devuelve NUEVA lista (puro)
const sortTasks = (list, comparator) =>
  freezeArrayCopy([...list].sort(comparator));

// ------------------------------
// 🧰 Operaciones compuestas (puro)
// Ejemplo: filtrar por estado y ordenar por vencimiento
// ------------------------------
const filterAndSort = (list, predicates, comparator) =>
  pipe(
    (xs) => filterTasks(xs, ...predicates),
    (xs) => sortTasks(xs, comparator)
  )(list);

// ------------------------------
// 💾 Persistencia funcional
// (puro) serializar/deserializar
// ------------------------------
const serializeTasks = (list) =>
  JSON.stringify(
    list.map((t) => ({
      ...t,
      creacion: t.creacion ? t.creacion.toISOString() : null,
      ultimaEdicion: t.ultimaEdicion ? t.ultimaEdicion.toISOString() : null,
      vencimiento: t.vencimiento ? t.vencimiento.toISOString() : null,
    })),
    null,
    2
  );

const deserializeTasks = (json) => {
  const raw = JSON.parse(json);
  const list = raw.map((r) =>
    deepFreeze({
      ...r,
      creacion: r.creacion ? new Date(r.creacion) : null,
      ultimaEdicion: r.ultimaEdicion ? new Date(r.ultimaEdicion) : null,
      vencimiento: r.vencimiento ? new Date(r.vencimiento) : null,
    })
  );
  return deepFreeze(list);
};

// =======================================================
// 🚪 CLI / I-O (impuro, reducido al mínimo)
// =======================================================
const prompt = require("prompt-sync")({ sigint: true }); // impuro (entrada)
const fs = require("fs"); // impuro (archivo)
const PATH_DB = "./tasks.json";

// Dependencias inyectables para pureza en el core:
const env = {
  now: () => new Date(),
  // genId se inyecta para que la creación sea testeable
  genId: (() => {
    // contador cerrado: no toca globales del programa
    let c = 0;
    return () => `t-${Date.now()}-${++c}`;
  })(),
};

// I/O impuro reducido
const readFileOr = (path, fallback) => {
  try {
    return fs.readFileSync(path, "utf8");
  } catch {
    return fallback;
  }
};

const writeFile = (path, content) => {
  fs.writeFileSync(path, content, "utf8");
};

// Capa de estado "externo" sólo en la CLI
let TASKS = (() => {
  const raw = readFileOr(PATH_DB, null);
  if (!raw) return deepFreeze([]);
  try {
    return deserializeTasks(raw);
  } catch {
    return deepFreeze([]);
  }
})();

// ---------- UI helpers (impuro: sólo formateo/console) ----------
const show = (msg) => console.log(msg);
const showTask = (t) =>
  console.log(
    [
      `# ${t.titulo}`,
      `   • Estado: ${t.estado}`,
      `   • Dificultad: ${t.dificultad}`,
      `   • Creación: ${t.creacion?.toLocaleString() ?? "-"}`,
      `   • Últ. edición: ${t.ultimaEdicion?.toLocaleString() ?? "-"}`,
      `   • Vence: ${t.vencimiento?.toLocaleDateString() ?? "-"}`,
      `   • Desc: ${t.descripcion || "-"}`,
      `   • ID: ${t.id}`,
    ].join("\n")
  );

const persist = () => writeFile(PATH_DB, serializeTasks(TASKS));

// ------------------------------
// Menú (impuro, pero fino)
// ------------------------------
const mainMenu = () => {
  show("\n=== ToDo List (Funcional) ===");
  show("1) Agregar tarea");
  show("2) Listar tareas");
  show("3) Buscar por título");
  show("4) Filtrar por estado");
  show("5) Ordenar");
  show("6) Editar tarea");
  show("0) Salir");
  const op = prompt("> ");

  switch (op) {
    case "1":
      return uiAgregar();
    case "2":
      return uiListar();
    case "3":
      return uiBuscar();
    case "4":
      return uiFiltrarEstado();
    case "5":
      return uiOrdenar();
    case "6":
      return uiEditar();
    case "0":
      show("👋 Adiós");
      process.exit(0);
    default:
      show("Opción inválida");
      return mainMenu();
  }
};

const ask = (q, def = "") => {
  const v = prompt(`${q}${def ? ` (${def})` : ""}: `);
  return v.trim() === "" ? def : v.trim();
};

// ------------------------------
// Acciones de menú (impuras minimalistas)
// ------------------------------
function uiAgregar() {
  try {
    const titulo = ask("Título");
    const descripcion = ask("Descripción");
    const venc = ask("Vencimiento YYYY-MM-DD", "");
    const dif = ask("Dificultad [Fácil|Medio|Difícil]", DIFICULTAD.FACIL);
    const nueva = makeTask(
      { titulo, descripcion, vencimiento: venc || null, dificultad: dif },
      env
    );
    TASKS = addTask(TASKS, nueva);
    persist();
    show("✅ Tarea agregada");
  } catch (e) {
    show("❌ " + e.message);
  }
  return mainMenu();
}

function uiListar() {
  if (TASKS.length === 0) {
    show("⚠️ Sin tareas");
    return mainMenu();
  }
  TASKS.forEach(showTask);
  return mainMenu();
}

function uiBuscar() {
  const q = ask("Buscar por título contiene");
  const res = filterTasks(TASKS, byTituloIncludes(q));
  if (res.length === 0) show("⚠️ Sin coincidencias");
  res.forEach(showTask);
  return mainMenu();
}

function uiFiltrarEstado() {
  const e = ask("Estado [Pendiente|En Curso|Terminada|Cancelada]", ESTADOS.PENDIENTE);
  const res = filterTasks(TASKS, byEstado(e));
  if (res.length === 0) show("⚠️ No hay tareas con ese estado");
  res.forEach(showTask);
  return mainMenu();
}

function uiOrdenar() {
  show("1) Por creación (asc)");
  show("2) Por vencimiento (asc)");
  show("3) Por título (A→Z)");
  const o = prompt("> ");
  const cmp =
    o === "1" ? sortByCreacion :
    o === "2" ? sortByVencimiento :
    o === "3" ? sortByTitulo :
    null;

  if (!cmp) {
    show("Sin ordenar");
    return mainMenu();
  }
  const res = sortTasks(TASKS, cmp);
  res.forEach(showTask);
  return mainMenu();
}

function uiEditar() {
  const id = ask("ID de la tarea a editar");
  const t = TASKS.find((x) => x.id === id);
  if (!t) {
    show("❌ ID no encontrado");
    return mainMenu();
  }

  showTask(t);
  show("Editar: 1) Título  2) Descripción  3) Estado  4) Dificultad  5) Vencimiento  0) Cancelar");
  const op = prompt("> ");
  const now = env.now();

  try {
    if (op === "1") {
      const v = ask("Nuevo título", t.titulo);
      TASKS = updateTaskById(TASKS, id, (task) => setTitulo(task, v, now), now);
    } else if (op === "2") {
      const v = ask("Nueva descripción", t.descripcion);
      TASKS = updateTaskById(TASKS, id, (task) => setDescripcion(task, v, now), now);
    } else if (op === "3") {
      const v = ask("Nuevo estado [Pendiente|En Curso|Terminada|Cancelada]", t.estado);
      TASKS = updateTaskById(TASKS, id, (task) => setEstado(task, v, now), now);
    } else if (op === "4") {
      const v = ask("Nueva dificultad [Fácil|Medio|Difícil]", t.dificultad);
      TASKS = updateTaskById(TASKS, id, (task) => setDificultad(task, v, now), now);
    } else if (op === "5") {
      const v = ask("Nuevo vencimiento YYYY-MM-DD (vacío para limpiar)", t.vencimiento ? t.vencimiento.toISOString().slice(0,10) : "");
      TASKS = updateTaskById(TASKS, id, (task) => setVencimiento(task, v || null, now), now);
    } else {
      show("Cancelado");
      return mainMenu();
    }
    persist();
    show("✅ Tarea actualizada");
  } catch (e) {
    show("❌ " + e.message);
  }
  return mainMenu();
}

// ------------------------------
// Arranque CLI (impuro)
// ------------------------------
(function start() {
  // Pequeña demo de composición (bonus): listar Pendientes ordenadas por Vencimiento
  const pendientesOrdenadas = filterAndSort(
    TASKS,
    [byEstado(ESTADOS.PENDIENTE)],
    sortByVencimiento
  );
  if (pendientesOrdenadas.length) {
    show("\n➡️  Pendientes (ordenadas por vencimiento):");
    pendientesOrdenadas.forEach(showTask);
  }
  mainMenu();
})();
