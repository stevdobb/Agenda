<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar as VCalendar } from 'radix-vue'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-vue-next'
import { type Awaited, type DateValue, useForwardProps, useForwardPropsEmits } from 'radix-vue'
import { type CalendarRootProps, useCalendar } from 'radix-vue/dist/Calendar/useCalendar'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

const props = defineProps<CalendarRootProps>()
const emits = defineEmits<typeof useCalendar().emits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)

function useVCalendar(
  props: Awaited<typeof CalendarRootProps>,
  emits: Awaited<typeof useCalendar().emits>,
) {
  const model = useVModel(props, undefined, emits, {
    passive: true,
    defaultValue: props.defaultValue,
  })

  return computed({
    get() {
      if (props.mode === 'range')
        return model.value as DateRange
      if (props.mode === 'multiple')
        return model.value as DateValue[]
      return model.value as DateValue | undefined
    },
    set(value) {
      model.value = value
    },
  })
}

// Custom useVModel equivalent, since useVModel is from @vueuse/core which might not be installed
function useVModel<T>(props: any, key: string, emits: any, options: { passive?: boolean, defaultValue?: T } = {}) {
  const internalValue = ref(options.defaultValue);

  watchEffect(() => {
    if (key in props) {
      internalValue.value = props[key];
    }
  });

  return computed({
    get() {
      return internalValue.value as T;
    },
    set(value) {
      internalValue.value = value;
      emits(`update:${key}`, value);
    },
  });
}
</script>

<template>
  <VCalendar
    v-bind="forwarded"
    :class="cn('p-3', props.class)"
    :next-button="buttonVariants({ variant: 'outline' })"
    :prev-button="buttonVariants({ variant: 'outline' })"
    :next-button-class="cn('absolute top-3 right-3 h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100')"
    :prev-button-class="cn('absolute top-3 left-3 h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100')"
  >
    <template #day="{ date }">
      <slot name="day" :date="date" />
    </template>
    <template #caption="{ date }">
      <slot name="caption" :date="date" />
    </template>
    <template #header>
      <div class="flex justify-between items-center">
        <Button
          variant="outline"
          class="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          @click="emits('prev')"
        >
          <ChevronLeftIcon class="h-4 w-4" />
        </Button>
        <span class="text-sm font-medium">
          {{ date?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }}
        </span>
        <Button
          variant="outline"
          class="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          @click="emits('next')"
        >
          <ChevronRightIcon class="h-4 w-4" />
        </Button>
      </div>
    </template>
  </VCalendar>
</template>