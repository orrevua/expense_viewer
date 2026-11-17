'use client';

import { categoryColor } from '@/lib/palette';
import { useLocale } from './LocaleProvider';

export default function CategoryDot({ color, size = 10 }) {
  const { dark } = useLocale();
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: categoryColor(color, dark) }} />;
}
