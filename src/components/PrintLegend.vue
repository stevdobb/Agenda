
<script setup lang="ts">
import { useCalendarStore } from '@/stores/calendar'
import { Card, CardContent } from '@/components/ui/card'

const store = useCalendarStore()
</script>

<template>
  <Card class="w-full">
    <!-- <CardHeader>
      <CardTitle>Legenda</CardTitle>
    </CardHeader> -->
    <CardContent>
      <ul class="flex flex-wrap gap-x-6 gap-y-2 pt-8">
        <li v-for="type in store.eventTypes" :key="type.name" class="flex items-center">
          <span class="w-5 h-5 inline-block mr-3 rounded-full" :style="{ backgroundColor: type.color }"></span>
          <span class="text-sm">{{ type.name }}</span>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
