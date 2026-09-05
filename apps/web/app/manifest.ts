import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BarberOS',
    short_name: 'BarberOS',
    description: 'Operacao inteligente para barbearias',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f5f2',
    theme_color: '#b86a45',
    icons: [],
  };
}
