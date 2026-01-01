<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
)

const props = defineProps<{
  for?: string
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <label
    :for="props.for"
    :class="cn(labelVariants(), props.class)"
  >
    <slot />
  </label>
</template>