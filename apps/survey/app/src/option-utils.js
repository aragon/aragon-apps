const OPTION_COLORS = ['#028CD1', '#39CAD0', '#8CD102', '#CAD039', '#D0CA39']

export function getOptionColor(optionId) {
  // OptionId indexing starts from 1, so subtract 1
  return OPTION_COLORS[(optionId - 1) % OPTION_COLORS.length]
}
