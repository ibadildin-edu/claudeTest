import { useCallback, type ChangeEvent } from 'react'
import { useGetLocationsQuery } from '@/api/locationsApi'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Select } from '@/components/ui/Select'
import { locationChanged, selectLocationId } from './filtersSlice'

const ALL_LOCATIONS = 'all'

export function LocationFilter() {
  const locationId = useAppSelector(selectLocationId)
  const dispatch = useAppDispatch()
  const { data: locations = [], isLoading } = useGetLocationsQuery()

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target
      dispatch(locationChanged(value === ALL_LOCATIONS ? null : Number(value)))
    },
    [dispatch],
  )

  return (
    <Select
      prefix="Точка"
      aria-label="Точка"
      className="min-w-52"
      value={locationId ?? ALL_LOCATIONS}
      onChange={handleChange}
      disabled={isLoading}
    >
      <option value={ALL_LOCATIONS}>Вся сеть</option>
      {locations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </Select>
  )
}
