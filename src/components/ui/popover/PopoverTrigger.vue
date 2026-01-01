<script setup lang="ts">
import { PopoverTrigger, type PopoverTriggerProps, useForwardProps } from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<PopoverTriggerProps>()

const forwardedProps = useForwardProps(props)
</script>

<template>
  <PopoverTrigger v-bind="forwardedProps">
    <slot />
  </PopoverTrigger>
</template>
