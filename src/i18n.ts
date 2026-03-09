import { createI18n } from 'vue-i18n';
import { useStorage } from '@vueuse/core';
import en from './locales/en.json';
import nl from './locales/nl.json';
import fr from './locales/fr.json';

const storedLocale = useStorage('language', 'en');

const i18n = createI18n({
  legacy: false,
  locale: storedLocale.value,
  fallbackLocale: 'en',
  messages: {
    en,
    nl,
    fr,
  },
});

export default i18n;
