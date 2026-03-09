
<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/solid'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

defineProps<{
  title: string
  description: string
}>()

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <Card class="relative w-full max-w-md">
      <button
        @click="emit('cancel')"
        class="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
        :aria-label="$t('close')"
      >
        <XMarkIcon class="h-5 w-5" />
      </button>
      <CardHeader>
        <CardTitle>{{ title }}</CardTitle>
        <CardDescription>{{ description }}</CardDescription>
      </CardHeader>
      <CardFooter class="flex justify-end gap-4">
        <Button variant="outline" @click="emit('cancel')">{{ $t('cancel') }}</Button>
        <Button @click="emit('confirm')">{{ $t('confirm') }}</Button>
      </CardFooter>
    </Card>
  </div>
</template>
