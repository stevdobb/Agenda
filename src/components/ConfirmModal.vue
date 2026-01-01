
<script setup lang="ts">
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
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>{{ title }}</CardTitle>
        <CardDescription>{{ description }}</CardDescription>
      </CardHeader>
      <CardFooter class="flex justify-end gap-4">
        <Button variant="outline" @click="emit('cancel')">Cancel</Button>
        <Button @click="emit('confirm')">Confirm</Button>
      </CardFooter>
    </Card>
  </div>
</template>
