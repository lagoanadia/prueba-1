// Datos compartidos por los widgets de Comida
export const MEALS = { desayuno: 'Desayuno', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' }
export const OUT = 'fuera' // "Comer fuera"

// Platos de ejemplo para empezar (el usuario los puede cambiar)
export const DEFAULT_DISHES = [
  { id: 'd1', name: 'Curry de garbanzos con arroz', for: ['comida', 'cena'], time: 35,
    ingredients: ['Garbanzos cocidos', 'Leche de coco', 'Cebolla', 'Ajo', 'Jengibre', 'Curry en polvo', 'Tomate triturado', 'Arroz basmati'],
    steps: ['Sofríe cebolla, ajo y jengibre.', 'Añade el curry y el tomate, 2 minutos.', 'Incorpora garbanzos y leche de coco.', 'Cuece 15 minutos y sirve con arroz.'] },
  { id: 'd2', name: 'Pasta con verduras y tofu', for: ['comida', 'cena'], time: 25,
    ingredients: ['Pasta', 'Calabacín', 'Pimiento', 'Tofu', 'Salsa de soja', 'Ajo'],
    steps: ['Cuece la pasta.', 'Saltea las verduras y el tofu en dados.', 'Mezcla con la pasta y la soja.'] },
  { id: 'd3', name: 'Salmón al horno con patata', for: ['cena'], time: 40,
    ingredients: ['Salmón', 'Patata', 'Limón', 'Eneldo', 'Aceite de oliva'],
    steps: ['Hornea la patata en rodajas 20 min a 200 °C.', 'Añade el salmón con limón y eneldo.', 'Hornea 15 minutos más.'] },
  { id: 'd4', name: 'Ensalada de quinoa', for: ['comida'], time: 20,
    ingredients: ['Quinoa', 'Tomate', 'Pepino', 'Aguacate', 'Limón'],
    steps: ['Cuece la quinoa y enfríala.', 'Corta las verduras.', 'Mezcla y aliña con limón.'] },
  { id: 'd5', name: 'Tortitas de avena', for: ['desayuno'], time: 15,
    ingredients: ['Avena', 'Plátano', 'Huevo', 'Leche'],
    steps: ['Tritura todo.', 'Haz las tortitas en sartén.'] },
  { id: 'd6', name: 'Yogur con fruta y nueces', for: ['merienda', 'desayuno'], time: 5,
    ingredients: ['Yogur', 'Fruta de temporada', 'Nueces'],
    steps: ['Mezcla y listo.'] },
]

export const dishesOf = (data) => data.dishes ?? DEFAULT_DISHES
export const mealsOf = (data) => data.meals ?? ['comida', 'cena']
export const activeDishOf = (data) => dishesOf(data).find((d) => d.id === data.activeDish) ?? dishesOf(data)[0]
export const dishName = (dishes, id) => (id === OUT ? 'Comer fuera' : dishes.find((d) => d.id === id)?.name ?? '')

/** Cuántas veces sale cada plato en el menú de unos días (para batch cooking y la compra). */
export function dishCounts(data, days) {
  const menu = data.menu ?? {}
  const counts = {}
  days.forEach((d) => Object.values(menu[d] ?? {}).forEach((id) => { if (id && id !== OUT) counts[id] = (counts[id] ?? 0) + 1 }))
  return counts
}
