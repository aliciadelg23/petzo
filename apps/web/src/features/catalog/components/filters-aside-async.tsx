// RSC async — busca categories + brands e renderiza <FilterPanel>.
// Isolado em componente próprio para poder ser envolvido em <Suspense>
// separado do grid de produtos → streaming: cada seção aparece assim que
// seu fetch termina, sem esperar o outro.

import { listBrands, listCategories } from '../api';
import { FilterPanel } from './filter-panel';

export async function FiltersAsideAsync() {
  const [categoriesRes, brandsRes] = await Promise.all([listCategories(), listBrands()]);
  return <FilterPanel categories={categoriesRes.items} brands={brandsRes.items} />;
}
