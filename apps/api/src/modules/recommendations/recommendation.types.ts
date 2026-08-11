import type { Pet, Product, Category, Brand } from '@prisma/client';

/**
 * Um produto candidato, com relações mínimas que o scorer precisa.
 * Nunca inclui inventory internals na saída pública.
 */
export interface RecommendationCandidate {
  product: Product & {
    category: Category;
    brand: Brand;
    images: { url: string; alt: string; position: number }[];
  };
}

/**
 * Um item recomendado retornado ao consumidor da API.
 */
export interface Recommendation {
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string };
  /**
   * Pontuação interna (não tem semântica pública além de "maior = mais recomendado").
   * Exposta para o front decidir apresentação/testes de A/B — não normalizada.
   */
  score: number;
  /** Razões humano-legíveis do "por que" — bom para explainability. */
  reasons: string[];
}

/**
 * Resposta padronizada. `strategy` permite ao consumidor saber qual algoritmo
 * gerou as recomendações (útil para debug e para não quebrar clients quando
 * migrarmos de rules → ML → externo).
 */
export interface RecommendationResult {
  petId: string;
  strategy: string;
  disclaimer: string;
  items: Recommendation[];
}

/**
 * Contrato do motor. TROCAR de implementação (regras → ML → serviço externo)
 * significa criar outra classe que implemente esta interface + registrar no
 * factory. A API pública (endpoint + response shape) NÃO muda.
 */
export interface RecommendationEngine {
  /** Identificador de estratégia, aparece na resposta. */
  readonly strategy: string;

  recommendForPet(input: {
    pet: Pet;
    userId: string;
    limit: number;
  }): Promise<Recommendation[]>;
}
