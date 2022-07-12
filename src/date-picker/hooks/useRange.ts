import { ref, computed, watchEffect } from '@vue/composition-api';
import dayjs from 'dayjs';
import { usePrefixClass, useConfig } from '../../hooks/useConfig';

import { TdDateRangePickerProps, DateValue } from '../type';
import useFormat from './useFormat';
import useRangeValue from './useRangeValue';

export const PARTIAL_MAP = { first: 'start', second: 'end' };

export default function useRange(props: TdDateRangePickerProps, { emit }: any) {
  const COMPONENT_NAME = usePrefixClass('date-range-picker');
  const { global } = useConfig('datePicker');

  const isMountedRef = ref(false);
  const inputRef = ref();

  const {
    value, onChange, time, month, year, cacheValue, isFirstValueSelected,
  } = useRangeValue(props);

  const formatRef = computed(() => useFormat({
    mode: props.mode,
    value: props.value,
    format: props.format,
    valueType: props.valueType,
    enableTimePicker: props.enableTimePicker,
  }));

  const popupVisible = ref(false);
  const isHoverCell = ref(false);
  const activeIndex = ref(0); // 确定当前选中的输入框序号
  const inputValue = ref(formatRef.value.formatDate(props.value)); // 未真正选中前可能不断变更输入框的内容

  // input 设置
  const rangeInputProps = computed(() => ({
    ...props.rangeInputProps,
    ref: inputRef,
    clearable: props.clearable,
    prefixIcon: props.prefixIcon,
    readonly: !props.allowInput,
    separator: props.separator,
    placeholder: props.placeholder || global.value.placeholder[props.mode],
    activeIndex: popupVisible.value ? activeIndex.value : undefined,
    class: {
      [`${COMPONENT_NAME.value}__input--placeholder`]: isHoverCell.value,
    },
    onClick: ({ position }: any) => {
      activeIndex.value = position === 'first' ? 0 : 1;
    },
    onClear: ({ e }: { e: MouseEvent }) => {
      e.stopPropagation();
      popupVisible.value = false;
      onChange?.([], { dayjsValue: [], trigger: 'clear' });
      emit('clear', [], { dayjsValue: [], trigger: 'clear' });
    },
    onBlur: (newVal: string[], { e, position }: any) => {
      props.onBlur?.({ value: newVal, partial: PARTIAL_MAP[position], e });
      emit('blur', { value: newVal, partial: PARTIAL_MAP[position], e });
    },
    onFocus: (newVal: string[], { e, position }: any) => {
      props.onFocus?.({ value: newVal, partial: PARTIAL_MAP[position], e });
      emit('focus', { value: newVal, partial: PARTIAL_MAP[position], e });
      activeIndex.value = position === 'first' ? 0 : 1;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onChange: (newVal: string[], { e, position }: any) => {
      inputValue.value = newVal;

      // 跳过不符合格式化的输入框内容
      if (!formatRef.value.isValidDate(newVal)) return;
      const newYear: Array<number> = [];
      const newMonth: Array<number> = [];
      const newTime: Array<string> = [];
      newVal.forEach((v, i) => {
        newYear.push(dayjs(v).year() || year.value[i]);
        newMonth.push(dayjs(v).month() || month.value[i]);
        newTime.push(dayjs(v).format(formatRef.value.timeFormat) || time.value[i]);
      });
      year.value = newYear;
      month.value = newMonth;
      time.value = newTime;
    },
    onEnter: (newVal: string[]) => {
      if (!formatRef.value.isValidDate(newVal) && !formatRef.value.isValidDate(value.value)) return;

      popupVisible.value = false;
      if (formatRef.value.isValidDate(newVal)) {
        onChange?.(formatRef.value.formatDate(newVal, { formatType: 'valueType' }) as DateValue[], {
          dayjsValue: newVal.map((v) => dayjs(v)),
          trigger: 'enter',
        });
      } else if (formatRef.value.isValidDate(value.value)) {
        inputValue.value = formatRef.value.formatDate(value.value);
      } else {
        inputValue.value = [];
      }
    },
  }));

  // popup 设置
  const popupProps = computed(() => ({
    expandAnimation: true,
    ...props.popupProps,
    overlayStyle: props.popupProps?.overlayStyle ?? { width: 'auto' },
    overlayClassName: [props.popupProps?.overlayClassName, `${COMPONENT_NAME.value}__panel-container`],
    onVisibleChange: (visible: boolean, context: any) => {
      // 输入框点击不关闭面板
      if (context.trigger === 'trigger-element-click') {
        const indexMap = { 0: 'first', 1: 'second' };
        inputRef.value?.focus?.({ position: indexMap[activeIndex.value] });
        popupVisible.value = true;
        return;
      }
      if (visible) {
        // 展开后重置点击次数
        isFirstValueSelected.value = false;
      } else {
        isHoverCell.value = false;
        inputValue.value = formatRef.value.formatDate(value.value);
      }

      popupVisible.value = visible;
    },
  }));

  // 输入框响应 value 变化
  watchEffect(() => {
    if (!value.value) {
      inputValue.value = [];
      cacheValue.value = [];
      time.value = [dayjs().format(formatRef.value.timeFormat), dayjs().format(formatRef.value.timeFormat)];
      return;
    }
    if (!formatRef.value.isValidDate(value.value, 'valueType')) return;

    inputValue.value = formatRef.value.formatDate(value.value);
    cacheValue.value = formatRef.value.formatDate(value.value);
    time.value = formatRef.value.formatTime(value.value) as string[];
  });

  // activeIndex 变化自动 focus 对应输入框
  watchEffect(() => {
    if (!isMountedRef.value) {
      isMountedRef.value = true;
      return;
    }
    const indexMap = { 0: 'first', 1: 'second' };
    inputRef.value?.focus?.({ position: indexMap[activeIndex.value] });
  });

  return {
    year,
    month,
    value,
    time,
    inputValue,
    popupVisible,
    rangeInputProps,
    popupProps,
    isHoverCell,
    activeIndex,
    isFirstValueSelected,
    cacheValue,
    onChange,
  };
}