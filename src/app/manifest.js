// Web app manifest (served at /manifest.webmanifest) — makes the app installable.
export default function manifest() {
  return {
    name: 'Controle de Gastos',
    short_name: 'Gastos',
    description: 'Gastos, cartões, contas fixas, parcelas e plano para guardar dinheiro.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#120d1a',
    theme_color: '#6d28d9',
    lang: 'pt-BR',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Transações', url: '/transactions', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Cartões', url: '/accounts', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Parcelas', url: '/installments', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
