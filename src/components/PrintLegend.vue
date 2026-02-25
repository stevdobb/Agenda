
<script setup lang="ts">
import { useCalendarStore } from '@/stores/calendar'
import { Card, CardContent } from '@/components/ui/card'

const store = useCalendarStore()
</script>

<template>
  <Card class="legend-card w-full">
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

<style scoped>
.legend-card {
  border-color: hsl(var(--border) / 0.65);
  background-color: hsl(var(--card) / 0.9);
  box-shadow: 0 14px 28px hsl(218 56% 20% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.14);
}

@media print {
  .legend-card {
    border-color: hsl(20 5.9% 90%);
    background: #fff;
    box-shadow: none;
  }
}
</style>
