import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BarberpS',
    short_name: 'BarberpS',
    description: 'pperacao inteligente para barbearias',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f5f2',
    theme_color: '#F64C72',
    icons: [],
  };
}
