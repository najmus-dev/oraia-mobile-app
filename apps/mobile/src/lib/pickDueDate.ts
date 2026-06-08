import { Platform } from 'react-native';
import { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';

function isPickerSet(event: DateTimePickerEvent): boolean {
  return event.type === 'set';
}

/** Android has no datetime mode — chain date then time pickers (library recommendation). */
export function openAndroidDueDatePicker(value: Date, onPicked: (date: Date) => void): void {
  if (Platform.OS !== 'android') return;

  DateTimePickerAndroid.open({
    value,
    mode: 'date',
    onChange: (event, selectedDate) => {
      if (!isPickerSet(event) || !selectedDate) return;

      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: 'time',
        is24Hour: false,
        onChange: (timeEvent, selectedTime) => {
          if (!isPickerSet(timeEvent) || !selectedTime) return;
          const merged = new Date(selectedDate);
          merged.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
          onPicked(merged);
        },
      });
    },
  });
}

export function isIosDueDatePicker(): boolean {
  return Platform.OS === 'ios';
}
