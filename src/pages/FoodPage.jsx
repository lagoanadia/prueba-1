import DishForm from './food/DishForm.jsx'
import MenuCard from './food/MenuCard.jsx'
import Cookbook from './food/Cookbook.jsx'
import ShoppingCard from './food/ShoppingCard.jsx'
import BatchCard from './food/BatchCard.jsx'
import Icon from '../components/Icon.jsx'
import { dishesOf } from '../widgets/comida/food.js'

/**
 * Comida: menú de la semana arriba; debajo el recetario (por niveles) y, a un lado, guardar comida,
 * lista de la compra y batch cooking. Las recetas se arrastran al menú, a la compra o al batch.
 */
export default function FoodPage({ data, update }) {
  const saveDish = (dish) => {
    const id = crypto.randomUUID()
    update((d) => ({ ...d, activeDish: id, dishes: [...dishesOf(d), { id, time: null, ...dish }] }))
  }
  return (
    <div className="page food">
      <header className="page-head"><h1 className="sr-only">Comida</h1></header>
      <div className="fd-layout">
        <MenuCard data={data} update={update} />
        <Cookbook data={data} update={update} />
        <div className="fd-rail">
          <section className="card fd-card" aria-label="Guardar comida">
            <div className="fd-title"><span className="fd-ic"><Icon name="comida" size={18} /></span><b>Guardar comida</b></div>
            <DishForm onSave={saveDish} />
          </section>
          <ShoppingCard data={data} update={update} />
          <BatchCard data={data} update={update} />
        </div>
      </div>
    </div>
  )
}
