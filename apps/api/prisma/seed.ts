/**
 * Seed fictício do Petzo.
 *
 * - Idempotente (usa upsert onde possível).
 * - Dados 100% fictícios. Emails terminam em @petzo.test.
 * - Senha de todos os usuários dev: "Password!1" (hash abaixo é PLACEHOLDER — a Fase
 *   de auth vai regravar com argon2 real via endpoint /auth/signup).
 */
import {
  PrismaClient,
  RoleName,
  Species,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  SubscriptionFrequency,
} from '@prisma/client';

const prisma = new PrismaClient();

/** Placeholder — não é um argon2/bcrypt real, apenas ocupa a coluna. */
const PLACEHOLDER_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$SEED_PLACEHOLDER_NOT_A_REAL_HASH_DO_NOT_USE_IN_PROD';

async function main() {
  console.log('[seed] iniciando…');

  // ---------------------------------------------------------------------------
  // Roles
  // ---------------------------------------------------------------------------
  const [customerRole, adminRole, supportRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: RoleName.CUSTOMER },
      update: {},
      create: { name: RoleName.CUSTOMER },
    }),
    prisma.role.upsert({
      where: { name: RoleName.ADMIN },
      update: {},
      create: { name: RoleName.ADMIN },
    }),
    prisma.role.upsert({
      where: { name: RoleName.SUPPORT },
      update: {},
      create: { name: RoleName.SUPPORT },
    }),
  ]);
  console.log('[seed] roles:', { customerRole: customerRole.id, adminRole: adminRole.id, supportRole: supportRole.id });

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@petzo.test' },
    update: {},
    create: {
      email: 'admin@petzo.test',
      name: 'Ana Administradora',
      passwordHash: PLACEHOLDER_HASH,
      phone: '+55 11 90000-0001',
      emailVerifiedAt: new Date(),
      roleId: adminRole.id,
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: 'alice.dev@petzo.test' },
    update: {},
    create: {
      email: 'alice.dev@petzo.test',
      name: 'Alice Dev',
      passwordHash: PLACEHOLDER_HASH,
      phone: '+55 11 90000-0002',
      emailVerifiedAt: new Date(),
      roleId: customerRole.id,
    },
  });

  const bruno = await prisma.user.upsert({
    where: { email: 'bruno.dev@petzo.test' },
    update: {},
    create: {
      email: 'bruno.dev@petzo.test',
      name: 'Bruno Dev',
      passwordHash: PLACEHOLDER_HASH,
      phone: '+55 21 90000-0003',
      roleId: customerRole.id,
    },
  });

  const support = await prisma.user.upsert({
    where: { email: 'suporte@petzo.test' },
    update: {},
    create: {
      email: 'suporte@petzo.test',
      name: 'Sam Suporte',
      passwordHash: PLACEHOLDER_HASH,
      roleId: supportRole.id,
    },
  });
  console.log('[seed] users:', { admin: admin.id, alice: alice.id, bruno: bruno.id, support: support.id });

  // ---------------------------------------------------------------------------
  // Addresses
  // ---------------------------------------------------------------------------
  await prisma.address.upsert({
    where: { id: 'seed-addr-alice-1' },
    update: {},
    create: {
      id: 'seed-addr-alice-1',
      userId: alice.id,
      label: 'Casa',
      street: 'Rua Fictícia',
      number: '123',
      complement: 'Apto 45',
      district: 'Bairro Exemplo',
      city: 'Cidade Ficta',
      state: 'SP',
      zip: '01234-567',
      isDefault: true,
    },
  });
  await prisma.address.upsert({
    where: { id: 'seed-addr-bruno-1' },
    update: {},
    create: {
      id: 'seed-addr-bruno-1',
      userId: bruno.id,
      label: 'Casa',
      street: 'Avenida Placebo',
      number: '789',
      district: 'Vila Simulada',
      city: 'Rio Exemplar',
      state: 'RJ',
      zip: '20000-000',
      isDefault: true,
    },
  });

  // ---------------------------------------------------------------------------
  // Pets
  // ---------------------------------------------------------------------------
  await prisma.pet.upsert({
    where: { id: 'seed-pet-luna' },
    update: {},
    create: {
      id: 'seed-pet-luna',
      userId: alice.id,
      name: 'Luna',
      species: Species.DOG,
      breed: 'Golden Retriever',
      birthDate: new Date('2022-04-15'),
    },
  });
  await prisma.pet.upsert({
    where: { id: 'seed-pet-thor' },
    update: {},
    create: {
      id: 'seed-pet-thor',
      userId: alice.id,
      name: 'Thor',
      species: Species.CAT,
      breed: 'SRD',
      birthDate: new Date('2023-11-02'),
    },
  });
  await prisma.pet.upsert({
    where: { id: 'seed-pet-nina' },
    update: {},
    create: {
      id: 'seed-pet-nina',
      userId: bruno.id,
      name: 'Nina',
      species: Species.RABBIT,
      breed: 'Angorá',
      birthDate: new Date('2024-06-10'),
    },
  });

  // ---------------------------------------------------------------------------
  // Categories (com hierarquia)
  // ---------------------------------------------------------------------------
  const dogs = await prisma.category.upsert({
    where: { slug: 'caes' },
    update: {},
    create: { slug: 'caes', name: 'Cães' },
  });
  const cats = await prisma.category.upsert({
    where: { slug: 'gatos' },
    update: {},
    create: { slug: 'gatos', name: 'Gatos' },
  });
  const dogFood = await prisma.category.upsert({
    where: { slug: 'racao-caes' },
    update: {},
    create: { slug: 'racao-caes', name: 'Ração para Cães', parentId: dogs.id },
  });
  const dogToys = await prisma.category.upsert({
    where: { slug: 'brinquedos-caes' },
    update: {},
    create: { slug: 'brinquedos-caes', name: 'Brinquedos para Cães', parentId: dogs.id },
  });
  const catFood = await prisma.category.upsert({
    where: { slug: 'racao-gatos' },
    update: {},
    create: { slug: 'racao-gatos', name: 'Ração para Gatos', parentId: cats.id },
  });
  const catAcc = await prisma.category.upsert({
    where: { slug: 'acessorios-gatos' },
    update: {},
    create: { slug: 'acessorios-gatos', name: 'Acessórios para Gatos', parentId: cats.id },
  });

  // ---------------------------------------------------------------------------
  // Brands (todas fictícias)
  // ---------------------------------------------------------------------------
  const petzoLabs = await prisma.brand.upsert({
    where: { slug: 'petzo-labs' },
    update: {},
    create: { slug: 'petzo-labs', name: 'Petzo Labs' },
  });
  const goldenBite = await prisma.brand.upsert({
    where: { slug: 'golden-bite' },
    update: {},
    create: { slug: 'golden-bite', name: 'GoldenBite' },
  });
  const purrfect = await prisma.brand.upsert({
    where: { slug: 'purrfect' },
    update: {},
    create: { slug: 'purrfect', name: 'Purrfect' },
  });
  const felizPet = await prisma.brand.upsert({
    where: { slug: 'feliz-pet' },
    update: {},
    create: { slug: 'feliz-pet', name: 'FelizPet' },
  });

  // ---------------------------------------------------------------------------
  // Products + Images + Inventory
  // ---------------------------------------------------------------------------
  type ProductSeed = {
    slug: string;
    name: string;
    description: string;
    categoryId: string;
    brandId: string;
    species: Species;
    /** centavos */
    price: number;
    stock: number;
    images: { url: string; alt: string; position: number }[];
  };

  const productSeeds: ProductSeed[] = [
    {
      slug: 'racao-premium-caes-adultos-15kg',
      name: 'Ração Premium Cães Adultos 15kg',
      description: 'Alimento seco completo para cães adultos de todas as raças. Sabor frango.',
      categoryId: dogFood.id,
      brandId: goldenBite.id,
      species: Species.DOG,
      price: 18990,
      stock: 40,
      images: [
        { url: 'https://placehold.co/600x600?text=Racao+Adulto', alt: 'Embalagem 15kg', position: 0 },
      ],
    },
    {
      slug: 'racao-super-premium-caes-filhotes-10kg',
      name: 'Ração Super Premium Cães Filhotes 10kg',
      description: 'Nutrição balanceada para filhotes em fase de crescimento. Sabor cordeiro.',
      categoryId: dogFood.id,
      brandId: goldenBite.id,
      species: Species.DOG,
      price: 24990,
      stock: 25,
      images: [
        { url: 'https://placehold.co/600x600?text=Filhotes', alt: 'Embalagem 10kg', position: 0 },
      ],
    },
    {
      slug: 'brinquedo-corda-caes-medio',
      name: 'Brinquedo de Corda Médio',
      description: 'Corda resistente para brincadeiras de puxa-puxa. Ideal para cães médios.',
      categoryId: dogToys.id,
      brandId: felizPet.id,
      species: Species.DOG,
      price: 3990,
      stock: 120,
      images: [
        { url: 'https://placehold.co/600x600?text=Corda', alt: 'Corda colorida', position: 0 },
      ],
    },
    {
      slug: 'bola-borracha-caes-p',
      name: 'Bola de Borracha P',
      description: 'Bola resistente para cães pequenos. Flutua e é lavável.',
      categoryId: dogToys.id,
      brandId: petzoLabs.id,
      species: Species.DOG,
      price: 2490,
      stock: 200,
      images: [{ url: 'https://placehold.co/600x600?text=Bola', alt: 'Bola vermelha', position: 0 }],
    },
    {
      slug: 'racao-gatos-adultos-3kg',
      name: 'Ração para Gatos Adultos 3kg',
      description: 'Ração para gatos adultos castrados. Auxilia no controle de peso.',
      categoryId: catFood.id,
      brandId: purrfect.id,
      species: Species.CAT,
      price: 8990,
      stock: 60,
      images: [{ url: 'https://placehold.co/600x600?text=Racao+Gato', alt: 'Pacote 3kg', position: 0 }],
    },
    {
      slug: 'racao-gatos-filhotes-1kg',
      name: 'Ração para Gatos Filhotes 1kg',
      description: 'Alimento para gatinhos em fase de crescimento. Sabor salmão.',
      categoryId: catFood.id,
      brandId: purrfect.id,
      species: Species.CAT,
      price: 4590,
      stock: 45,
      images: [
        { url: 'https://placehold.co/600x600?text=Filhotes+Gato', alt: 'Pacote 1kg', position: 0 },
      ],
    },
    {
      slug: 'arranhador-vertical-gatos',
      name: 'Arranhador Vertical para Gatos',
      description: 'Arranhador em sisal com base estável. 60cm.',
      categoryId: catAcc.id,
      brandId: felizPet.id,
      species: Species.CAT,
      price: 12990,
      stock: 18,
      images: [
        { url: 'https://placehold.co/600x600?text=Arranhador', alt: 'Arranhador vertical', position: 0 },
      ],
    },
    {
      slug: 'coleira-guia-caes-m',
      name: 'Coleira e Guia para Cães M',
      description: 'Kit coleira + guia em nylon. Tamanho M. Ajustável.',
      categoryId: dogToys.id,
      brandId: petzoLabs.id,
      species: Species.DOG,
      price: 6490,
      stock: 80,
      images: [{ url: 'https://placehold.co/600x600?text=Coleira', alt: 'Kit coleira', position: 0 }],
    },
    {
      slug: 'petisco-natural-caes-500g',
      name: 'Petisco Natural para Cães 500g',
      description: 'Petiscos desidratados de frango. Sem conservantes.',
      categoryId: dogFood.id,
      brandId: petzoLabs.id,
      species: Species.DOG,
      price: 3590,
      stock: 90,
      images: [{ url: 'https://placehold.co/600x600?text=Petisco', alt: 'Petiscos', position: 0 }],
    },
    {
      slug: 'brinquedo-varinha-gatos',
      name: 'Brinquedo Varinha para Gatos',
      description: 'Varinha com pena colorida. Estimula a caça e o exercício.',
      categoryId: catAcc.id,
      brandId: purrfect.id,
      species: Species.CAT,
      price: 1990,
      stock: 150,
      images: [{ url: 'https://placehold.co/600x600?text=Varinha', alt: 'Varinha', position: 0 }],
    },
  ];

  for (const p of productSeeds) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        categoryId: p.categoryId,
        brandId: p.brandId,
        species: p.species,
      },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        categoryId: p.categoryId,
        brandId: p.brandId,
        species: p.species,
        price: p.price,
        images: { create: p.images },
        inventory: { create: { quantity: p.stock, reserved: 0, reorderPoint: 10 } },
      },
    });
  }
  console.log('[seed] products:', productSeeds.length);

  // ---------------------------------------------------------------------------
  // Cart + Wishlist (alice)
  // ---------------------------------------------------------------------------
  const productBall = await prisma.product.findUniqueOrThrow({ where: { slug: 'bola-borracha-caes-p' } });
  const productTreats = await prisma.product.findUniqueOrThrow({ where: { slug: 'petisco-natural-caes-500g' } });
  const productScratcher = await prisma.product.findUniqueOrThrow({ where: { slug: 'arranhador-vertical-gatos' } });

  const aliceCart = await prisma.cart.upsert({
    where: { userId: alice.id },
    update: {},
    create: { userId: alice.id },
  });
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: aliceCart.id, productId: productBall.id } },
    update: { quantity: 2 },
    create: { cartId: aliceCart.id, productId: productBall.id, quantity: 2 },
  });
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: aliceCart.id, productId: productTreats.id } },
    update: { quantity: 1 },
    create: { cartId: aliceCart.id, productId: productTreats.id, quantity: 1 },
  });

  const aliceWishlist = await prisma.wishlist.upsert({
    where: { userId: alice.id },
    update: {},
    create: { userId: alice.id },
  });
  await prisma.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: aliceWishlist.id, productId: productScratcher.id } },
    update: {},
    create: { wishlistId: aliceWishlist.id, productId: productScratcher.id },
  });

  // ---------------------------------------------------------------------------
  // Coupon
  // ---------------------------------------------------------------------------
  await prisma.coupon.upsert({
    where: { code: 'BEMVINDO10' },
    update: {},
    create: {
      code: 'BEMVINDO10',
      description: 'Cupom de boas-vindas: 10% off no primeiro pedido.',
      discountPercent: 10,
      minOrderAmount: 5000,
      maxUses: 1000,
      active: true,
      endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  // ---------------------------------------------------------------------------
  // Sample Order (bruno, PAID)
  // ---------------------------------------------------------------------------
  const brunoAddress = await prisma.address.findUniqueOrThrow({ where: { id: 'seed-addr-bruno-1' } });
  const dogFoodProduct = await prisma.product.findUniqueOrThrow({
    where: { slug: 'racao-premium-caes-adultos-15kg' },
  });

  const existing = await prisma.order.findFirst({
    where: { userId: bruno.id, status: OrderStatus.PAID },
    orderBy: { createdAt: 'asc' },
  });

  if (!existing) {
    const subtotal = dogFoodProduct.price * 1;
    const shipping = 1500;
    const total = subtotal + shipping;

    await prisma.order.create({
      data: {
        userId: bruno.id,
        status: OrderStatus.PAID,
        subtotal,
        shipping,
        total,
        addressSnapshot: {
          label: brunoAddress.label,
          street: brunoAddress.street,
          number: brunoAddress.number,
          district: brunoAddress.district,
          city: brunoAddress.city,
          state: brunoAddress.state,
          zip: brunoAddress.zip,
        },
        items: {
          create: [
            {
              productId: dogFoodProduct.id,
              quantity: 1,
              priceSnapshot: dogFoodProduct.price,
              nameSnapshot: dogFoodProduct.name,
            },
          ],
        },
        payment: {
          create: {
            provider: PaymentProvider.PIX,
            providerRef: 'seed-pix-txid-0001',
            status: PaymentStatus.CAPTURED,
            amount: total,
            paidAt: new Date(),
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Subscription (alice, ração de gato mensal)
  // ---------------------------------------------------------------------------
  const catFoodProduct = await prisma.product.findUniqueOrThrow({
    where: { slug: 'racao-gatos-adultos-3kg' },
  });
  const existingSub = await prisma.subscription.findFirst({
    where: { userId: alice.id, productId: catFoodProduct.id },
  });
  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        userId: alice.id,
        productId: catFoodProduct.id,
        frequency: SubscriptionFrequency.MONTHLY,
        nextChargeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('[seed] concluído.');
}

main()
  .catch((e) => {
    console.error('[seed] erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
