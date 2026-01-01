
<script setup lang="ts">
import { useCalendarStore } from '@/stores/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const store = useCalendarStore()
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>Legenda</CardTitle>
    </CardHeader>
    <CardContent>
      <ul class="space-y-2">
        <li v-for="type in store.eventTypes" :key="type.name" class="flex items-center">
          <span class="w-5 h-5 inline-block mr-3 rounded-full" :style="{ backgroundColor: type.color }"></span>
          <span class="text-sm">{{ type.name }}</span>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
