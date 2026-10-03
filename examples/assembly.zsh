# Promptly / standalone generative zsh prompt
# Recipe: {"version":3,"seed":"possibility/43","style":"compose","palette":"ember","complexity":8,"glyphs":"unicode","label":"finn","material":"square","alphabet":"punctuation","symmetry":"none","height":12,"density":0.376,"ornamentSeed":"possibility/43","engine":"assembly","spread":0.995,"fragments":4,"connectivity":0}
# Source this file. Undo with promptly_off. Requires zsh 5.8+ and a UTF-8 locale.
# The only runtime dependencies are zsh builtins and its standard hook helpers.

if [[ -z ${ZSH_VERSION-} ]]; then
  printf '%s\n' 'Promptly requires zsh.' >&2
  return 1
fi

# Preserve the original prompt once, including when another artwork is sourced.
if (( ! ${+_promptly_active} )); then
  typeset -g _promptly_saved_prompt=$PROMPT
  typeset -g _promptly_saved_rprompt=$RPROMPT
  typeset -g _promptly_saved_ps2=$PS2
  typeset -g _promptly_saved_percent=$options[promptpercent]
  typeset -g _promptly_saved_subst=$options[promptsubst]
  typeset -g _promptly_saved_bang=$options[promptbang]
fi
typeset -g _promptly_active=1
typeset -g _promptly_width=-1

# The draw helper shares a dynamically scoped, temporary canvas with _build.
# Text is a sequence of curated single-cell glyphs, never terminal control codes.
_promptly_paint() {
  local -i _pp_y=$1 _pp_x=$2 _pp_count=$3 _pp_ink=$4
  local _pp_text=$5
  local -i _pp_i _pp_col _pp_index _pp_len=${#_pp_text}
  (( _pp_len > 0 )) || return 0
  for (( _pp_i = 0; _pp_i < _pp_count; _pp_i++ )); do
    (( _pp_col = _pp_x + _pp_i ))
    (( _pp_col >= 0 && _pp_col < _pp_w )) || continue
    (( _pp_index = _pp_y * _pp_w + _pp_col + 1 ))
    _pp_cells[_pp_index]=${_pp_text[$(( _pp_i % _pp_len + 1 ))]}
    _pp_inks[_pp_index]=$_pp_ink
  done
  return 0
}

# Wire cells carry four connection bits. Combining strokes yields the correct
# corner, tee, or crossing at the actual terminal width, including after resize.
_promptly_wire() {
  local -i _pp_y1=$1 _pp_x1=$2 _pp_y2=$3 _pp_x2=$4 _pp_ink=$5
  local _pp_charset=$6
  local -i _pp_dx=0 _pp_dy=0 _pp_length=0 _pp_before=0 _pp_after=0
  if (( _pp_y1 == _pp_y2 )); then
    (( _pp_dx = (_pp_x2 > _pp_x1) - (_pp_x2 < _pp_x1) ))
    (( _pp_length = (_pp_x2 - _pp_x1) * _pp_dx ))
    if (( _pp_dx > 0 )); then _pp_before=8; _pp_after=2; else _pp_before=2; _pp_after=8; fi
  elif (( _pp_x1 == _pp_x2 )); then
    (( _pp_dy = (_pp_y2 > _pp_y1) - (_pp_y2 < _pp_y1) ))
    (( _pp_length = (_pp_y2 - _pp_y1) * _pp_dy ))
    if (( _pp_dy > 0 )); then _pp_before=1; _pp_after=4; else _pp_before=4; _pp_after=1; fi
  else
    return 1
  fi
  (( _pp_length > 0 )) || return 0
  local -i _pp_i _pp_x _pp_y _pp_index _pp_mask
  for (( _pp_i=0; _pp_i<=_pp_length; _pp_i++ )); do
    (( _pp_x=_pp_x1+_pp_i*_pp_dx, _pp_y=_pp_y1+_pp_i*_pp_dy ))
    (( _pp_x >= 0 && _pp_x < _pp_w )) || continue
    (( _pp_index=_pp_y*_pp_w+_pp_x+1 ))
    _pp_mask=${_pp_edges[_pp_index]:-0}
    (( _pp_i > 0 )) && (( _pp_mask |= _pp_before ))
    (( _pp_i < _pp_length )) && (( _pp_mask |= _pp_after ))
    _pp_edges[_pp_index]=$_pp_mask
    _pp_cells[_pp_index]=${_pp_charset[$(( _pp_mask+1 ))]}
    (( _pp_inks[_pp_index] = _pp_ink > ${_pp_inks[_pp_index]:-0} ? _pp_ink : ${_pp_inks[_pp_index]:-0} ))
  done
  return 0
}

_promptly_build() {
  emulate -L zsh
  setopt multibyte
  local -i _pp_w=$(( ${COLUMNS:-80} - 1 ))
  # Leave the final column unused to avoid autowrap. Bound work in unusual PTYs.
  (( _pp_w < 1 )) && _pp_w=1
  (( _pp_w > 1000 )) && _pp_w=1000
  local -a _pp_cells _pp_inks _pp_colors _pp_edges
  _pp_colors=( '#6d5556' '#9b7570' '#efb779' '#df8d9e' '#b3d4c1' '#f1decc' )
  local -i _pp_height _pp_cursor
  local _pp_right
  if (( _pp_w >= 79 )); then
    _pp_height=11
    _pp_cursor=9
    _pp_right=''
    _promptly_paint 2 "$(( (154 * (_pp_w - 1) / 1000 + (4)) ))" "$(( 1 ))" 1 '╱'
    _promptly_paint 3 "$(( (154 * (_pp_w - 1) / 1000 + (2)) ))" "$(( 1 ))" 1 '─'
    _promptly_paint 3 "$(( (154 * (_pp_w - 1) / 1000 + (1)) ))" "$(( 1 ))" 1 '╲'
    _promptly_paint 2 "$(( (154 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 1 '╲'
    _promptly_paint 2 "$(( (154 * (_pp_w - 1) / 1000 + (-1)) ))" "$(( 1 ))" 1 '└'
    _promptly_paint 1 "$(( (154 * (_pp_w - 1) / 1000 + (-1)) ))" "$(( 1 ))" 1 '╱'
    _promptly_paint 0 "$(( (154 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 1 '╱'
    _promptly_paint 0 "$(( (154 * (_pp_w - 1) / 1000 + (1)) ))" "$(( 1 ))" 1 '─'
    _promptly_paint 0 "$(( (154 * (_pp_w - 1) / 1000 + (2)) ))" "$(( 1 ))" 1 '╲'
    _promptly_paint 1 "$(( (154 * (_pp_w - 1) / 1000 + (4)) ))" "$(( 1 ))" 1 '┐'
    _promptly_paint 3 "$(( (154 * (_pp_w - 1) / 1000 + (9)) ))" "$(( 1 ))" 2 '╲'
    _promptly_paint 2 "$(( (154 * (_pp_w - 1) / 1000 + (8)) ))" "$(( 1 ))" 2 '╲'
    _promptly_paint 2 "$(( (154 * (_pp_w - 1) / 1000 + (7)) ))" "$(( 1 ))" 2 '╱'
    _promptly_paint 1 "$(( (154 * (_pp_w - 1) / 1000 + (8)) ))" "$(( 1 ))" 2 '╱'
    _promptly_paint 0 "$(( (154 * (_pp_w - 1) / 1000 + (9)) ))" "$(( 1 ))" 2 '╱'
    _promptly_paint 1 "$(( (154 * (_pp_w - 1) / 1000 + (9)) ))" "$(( 1 ))" 2 '│'
    _promptly_paint 2 "$(( (154 * (_pp_w - 1) / 1000 + (9)) ))" "$(( 1 ))" 2 '│'
    _promptly_paint 9 "$(( (154 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 9 "$(( (154 * (_pp_w - 1) / 1000 + (-1)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 9 "$(( (154 * (_pp_w - 1) / 1000 + (-2)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 9 "$(( (154 * (_pp_w - 1) / 1000 + (-3)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 9 "$(( (154 * (_pp_w - 1) / 1000 + (-4)) ))" "$(( 1 ))" 0 '╲'
    _promptly_paint 7 "$(( (154 * (_pp_w - 1) / 1000 + (-9)) ))" "$(( 1 ))" 0 '│'
    _promptly_paint 6 "$(( (154 * (_pp_w - 1) / 1000 + (-9)) ))" "$(( 1 ))" 0 '┌'
    _promptly_paint 6 "$(( (154 * (_pp_w - 1) / 1000 + (-8)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 6 "$(( (154 * (_pp_w - 1) / 1000 + (-7)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 6 "$(( (154 * (_pp_w - 1) / 1000 + (-6)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 6 "$(( (154 * (_pp_w - 1) / 1000 + (-5)) ))" "$(( 1 ))" 0 '╱'
    _promptly_paint 5 "$(( (154 * (_pp_w - 1) / 1000 + (-4)) ))" "$(( 1 ))" 0 '╱'
    _promptly_paint 5 "$(( (154 * (_pp_w - 1) / 1000 + (-3)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (154 * (_pp_w - 1) / 1000 + (-2)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (154 * (_pp_w - 1) / 1000 + (-1)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (154 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (154 * (_pp_w - 1) / 1000 + (1)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (154 * (_pp_w - 1) / 1000 + (2)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (154 * (_pp_w - 1) / 1000 + (3)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (154 * (_pp_w - 1) / 1000 + (4)) ))" "$(( 1 ))" 0 '╲'
    _promptly_paint 6 "$(( (154 * (_pp_w - 1) / 1000 + (5)) ))" "$(( 1 ))" 0 '╲'
    _promptly_paint 6 "$(( (154 * (_pp_w - 1) / 1000 + (6)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 6 "$(( (154 * (_pp_w - 1) / 1000 + (7)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 6 "$(( (154 * (_pp_w - 1) / 1000 + (8)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 6 "$(( (154 * (_pp_w - 1) / 1000 + (9)) ))" "$(( 1 ))" 0 '┐'
    _promptly_paint 7 "$(( (154 * (_pp_w - 1) / 1000 + (9)) ))" "$(( 1 ))" 0 '│'
    _promptly_paint 9 "$(( (154 * (_pp_w - 1) / 1000 + (4)) ))" "$(( 1 ))" 0 '╱'
    _promptly_paint 9 "$(( (154 * (_pp_w - 1) / 1000 + (3)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 9 "$(( (154 * (_pp_w - 1) / 1000 + (2)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 9 "$(( (154 * (_pp_w - 1) / 1000 + (1)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 0 "$(( (154 * (_pp_w - 1) / 1000 + (-9)) ))" "$(( 1 ))" 2 ':'
    _promptly_paint 0 "$(( (154 * (_pp_w - 1) / 1000 + (-8)) ))" "$(( 1 ))" 2 '-'
    _promptly_paint 0 "$(( (154 * (_pp_w - 1) / 1000 + (-7)) ))" "$(( 1 ))" 2 '~'
    _promptly_paint 0 "$(( (154 * (_pp_w - 1) / 1000 + (-6)) ))" "$(( 1 ))" 2 '-'
    _promptly_paint 0 "$(( (154 * (_pp_w - 1) / 1000 + (-5)) ))" "$(( 1 ))" 2 '='
    _promptly_paint 7 "$(( (571 * (_pp_w - 1) / 1000 + (1)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 7 "$(( (571 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 7 "$(( (571 * (_pp_w - 1) / 1000 + (-1)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 7 "$(( (571 * (_pp_w - 1) / 1000 + (-2)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 7 "$(( (571 * (_pp_w - 1) / 1000 + (-3)) ))" "$(( 1 ))" 3 '╲'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (-4)) ))" "$(( 1 ))" 3 '╲'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (-5)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (-6)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (-7)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (-8)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (-9)) ))" "$(( 1 ))" 3 '╱'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (-10)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (-11)) ))" "$(( 1 ))" 3 '╲'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-13)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-14)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-15)) ))" "$(( 1 ))" 3 '└'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (-15)) ))" "$(( 1 ))" 3 '│'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (-15)) ))" "$(( 1 ))" 3 '│'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-15)) ))" "$(( 1 ))" 3 '┌'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-14)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-13)) ))" "$(( 1 ))" 3 '╱'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (-12)) ))" "$(( 1 ))" 3 '╱'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (-11)) ))" "$(( 1 ))" 3 '┬'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (-10)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (-9)) ))" "$(( 1 ))" 3 '╲'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (-8)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (-7)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (-6)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (-5)) ))" "$(( 1 ))" 3 '╱'
    _promptly_paint 0 "$(( (571 * (_pp_w - 1) / 1000 + (-4)) ))" "$(( 1 ))" 3 '╱'
    _promptly_paint 0 "$(( (571 * (_pp_w - 1) / 1000 + (-3)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 0 "$(( (571 * (_pp_w - 1) / 1000 + (-2)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 0 "$(( (571 * (_pp_w - 1) / 1000 + (-1)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 0 "$(( (571 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 0 "$(( (571 * (_pp_w - 1) / 1000 + (1)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 0 "$(( (571 * (_pp_w - 1) / 1000 + (2)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 0 "$(( (571 * (_pp_w - 1) / 1000 + (3)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 0 "$(( (571 * (_pp_w - 1) / 1000 + (4)) ))" "$(( 1 ))" 3 '╲'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (5)) ))" "$(( 1 ))" 3 '╲'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (6)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (7)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (8)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (9)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (10)) ))" "$(( 1 ))" 3 '╱'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (11)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 1 "$(( (571 * (_pp_w - 1) / 1000 + (12)) ))" "$(( 1 ))" 3 '╲'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (14)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (15)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (16)) ))" "$(( 1 ))" 3 '┐'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (16)) ))" "$(( 1 ))" 3 '│'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (16)) ))" "$(( 1 ))" 3 '│'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (16)) ))" "$(( 1 ))" 3 '┘'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (15)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (14)) ))" "$(( 1 ))" 3 '╱'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (13)) ))" "$(( 1 ))" 3 '╱'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (12)) ))" "$(( 1 ))" 3 '┴'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (11)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (10)) ))" "$(( 1 ))" 3 '╲'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (9)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (8)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (7)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 6 "$(( (571 * (_pp_w - 1) / 1000 + (6)) ))" "$(( 1 ))" 3 '╱'
    _promptly_paint 7 "$(( (571 * (_pp_w - 1) / 1000 + (5)) ))" "$(( 1 ))" 3 '╱'
    _promptly_paint 7 "$(( (571 * (_pp_w - 1) / 1000 + (4)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 7 "$(( (571 * (_pp_w - 1) / 1000 + (3)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 7 "$(( (571 * (_pp_w - 1) / 1000 + (2)) ))" "$(( 1 ))" 3 '─'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (-1)) ))" "$(( 1 ))" 0 '╴'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (-2)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-4)) ))" "$(( 1 ))" 0 '╱'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-7)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-8)) ))" "$(( 1 ))" 0 '╱'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-11)) ))" "$(( 1 ))" 0 '│'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (-11)) ))" "$(( 1 ))" 0 '│'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (-11)) ))" "$(( 1 ))" 0 '│'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-11)) ))" "$(( 1 ))" 0 '│'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-8)) ))" "$(( 1 ))" 0 '╲'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-7)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-5)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-4)) ))" "$(( 1 ))" 0 '╲'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (-2)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (-1)) ))" "$(( 1 ))" 0 '╴'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (2)) ))" "$(( 1 ))" 0 '╶'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (3)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (5)) ))" "$(( 1 ))" 0 '╲'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (8)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (9)) ))" "$(( 1 ))" 0 '╲'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (12)) ))" "$(( 1 ))" 0 '│'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (12)) ))" "$(( 1 ))" 0 '│'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (12)) ))" "$(( 1 ))" 0 '│'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (12)) ))" "$(( 1 ))" 0 '│'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (9)) ))" "$(( 1 ))" 0 '╱'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (8)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (6)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (5)) ))" "$(( 1 ))" 0 '╱'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (3)) ))" "$(( 1 ))" 0 '─'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (2)) ))" "$(( 1 ))" 0 '╶'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-12)) ))" "$(( 1 ))" 2 ':'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-10)) ))" "$(( 1 ))" 2 ':'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (10)) ))" "$(( 1 ))" 4 '='
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (13)) ))" "$(( 1 ))" 4 '?'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (-6)) ))" "$(( 1 ))" 4 '='
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (-3)) ))" "$(( 1 ))" 4 '!'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-6)) ))" "$(( 1 ))" 2 '+'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (-3)) ))" "$(( 1 ))" 2 '='
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-6)) ))" "$(( 1 ))" 4 '*'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-3)) ))" "$(( 1 ))" 4 '!'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (-6)) ))" "$(( 1 ))" 2 '~'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (-3)) ))" "$(( 1 ))" 2 '*'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (-12)) ))" "$(( 1 ))" 2 '~'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (-10)) ))" "$(( 1 ))" 2 '*'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-12)) ))" "$(( 1 ))" 4 '~'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (-9)) ))" "$(( 1 ))" 4 '.'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (-12)) ))" "$(( 1 ))" 4 '+'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (-10)) ))" "$(( 1 ))" 4 '?'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (4)) ))" "$(( 1 ))" 4 '='
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (6)) ))" "$(( 1 ))" 4 '~'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (4)) ))" "$(( 1 ))" 2 '~'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (6)) ))" "$(( 1 ))" 2 '~'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (4)) ))" "$(( 1 ))" 4 '+'
    _promptly_paint 2 "$(( (571 * (_pp_w - 1) / 1000 + (7)) ))" "$(( 1 ))" 4 '.'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (4)) ))" "$(( 1 ))" 2 '?'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (6)) ))" "$(( 1 ))" 2 '*'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (10)) ))" "$(( 1 ))" 2 '~'
    _promptly_paint 3 "$(( (571 * (_pp_w - 1) / 1000 + (13)) ))" "$(( 1 ))" 2 '~'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (10)) ))" "$(( 1 ))" 2 '~'
    _promptly_paint 5 "$(( (571 * (_pp_w - 1) / 1000 + (13)) ))" "$(( 1 ))" 2 '!'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (10)) ))" "$(( 1 ))" 4 '.'
    _promptly_paint 4 "$(( (571 * (_pp_w - 1) / 1000 + (13)) ))" "$(( 1 ))" 4 ':'
    _promptly_paint 4 "$(( (936 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 4 '!'
    _promptly_paint 9 "$(( (929 * (_pp_w - 1) / 1000 + (-2)) ))" "$(( 1 ))" 4 '*'
    _promptly_paint 9 "$(( (929 * (_pp_w - 1) / 1000 + (2)) ))" "$(( 1 ))" 4 '~'
    _promptly_paint 10 "$(( (0 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 6 ))" 2 '[finn]'
    _promptly_paint 10 "$(( (0 * (_pp_w - 1) / 1000 + (7)) ))" "$(( 1 ))" 4 '*'
  elif (( _pp_w >= 27 )); then
    _pp_height=2
    _pp_cursor=5
    _pp_right=''
    _promptly_paint 0 "$(( (0 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 7 ))" 2 '╭─ finn'
    _promptly_paint 0 "$(( (0 * (_pp_w - 1) / 1000 + (9)) ))" "$(( (1000 * (_pp_w - 1) / 1000 + (-5)) - (0 * (_pp_w - 1) / 1000 + (9)) ))" 0 '·'
    _promptly_paint 0 "$(( (1000 * (_pp_w - 1) / 1000 + (0)) - 2 ))" "$(( 3 ))" 3 '⟨◈⟩'
    _promptly_paint 1 "$(( (0 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 2 ))" 1 '╰─'
    _promptly_paint 1 "$(( (0 * (_pp_w - 1) / 1000 + (3)) ))" "$(( 1 ))" 4 '◈'
  else
    _pp_height=1
    _pp_cursor=2
    _pp_right=''
    _promptly_paint 0 0 1 4 '>'
  fi

  local _pp_result='' _pp_char _pp_previous=''
  local -i _pp_row _pp_col _pp_limit _pp_index _pp_ink
  for (( _pp_row = 0; _pp_row < _pp_height; _pp_row++ )); do
    _pp_limit=$(( _pp_w - 1 ))
    if (( _pp_row == _pp_height - 1 )); then
      _pp_limit=$(( _pp_cursor - 1 ))
      (( _pp_limit >= _pp_w )) && _pp_limit=$(( _pp_w - 1 ))
    else
      # Trim empty tails, leaving internal negative space intact.
      while (( _pp_limit > 0 )); do
        _pp_index=$(( _pp_row * _pp_w + _pp_limit + 1 ))
        [[ -n ${_pp_cells[_pp_index]-} && ${_pp_cells[_pp_index]} != ' ' ]] && break
        (( _pp_limit-- ))
      done
    fi
    for (( _pp_col = 0; _pp_col <= _pp_limit; _pp_col++ )); do
      _pp_index=$(( _pp_row * _pp_w + _pp_col + 1 ))
      _pp_char=${_pp_cells[_pp_index]:- }
      _pp_ink=${_pp_inks[_pp_index]:-0}
      if [[ $_pp_char != ' ' && $_pp_previous != $_pp_ink ]]; then
        _pp_result+="%F{${_pp_colors[$(( _pp_ink + 1 ))]}}"
        _pp_previous=$_pp_ink
      fi
      # Literal prompt data. Percent is escaped; never evaluate inscription text.
      _pp_result+=${_pp_char//\%/%%}
    done
    _pp_result+='%f%b%k'
    _pp_previous=''
    (( _pp_row < _pp_height - 1 )) && _pp_result+=$'\n'
  done
  typeset -g _promptly_frame=$_pp_result
  PS2="%F{${_pp_colors[2]}}... %f"
  _promptly_width=${COLUMNS:-80}
  return 0
}

# zsh re-expands PROMPT on SIGWINCH before its redraw hook runs. A shell-only
# expansion handles that path without taking over the user's signal handler.
# The normal case prints the cached frame; only a new width redraws the canvas.
_promptly_expand() {
  emulate -L zsh
  if [[ $_promptly_width != ${COLUMNS:-80} ]]; then
    _promptly_build
  fi
  print -r -- "$_promptly_frame"
}

_promptly_precmd() {
  emulate -L zsh
  if [[ $_promptly_width != ${COLUMNS:-80} ]]; then
    _promptly_build
  fi
  return 0
}

_promptly_redraw() {
  emulate -L zsh
  if [[ $_promptly_width != ${COLUMNS:-80} ]]; then
    _promptly_build
    zle reset-prompt
  fi
  return 0
}

promptly_off() {
  PROMPT=$_promptly_saved_prompt
  RPROMPT=$_promptly_saved_rprompt
  PS2=$_promptly_saved_ps2
  precmd_functions=( "${(@)precmd_functions:#_promptly_precmd}" )
  if [[ -o interactive ]]; then
    autoload -Uz add-zle-hook-widget
    add-zle-hook-widget -d line-pre-redraw _promptly_redraw
    zle -D _promptly_redraw
  fi
  [[ $_promptly_saved_percent == on ]] && setopt promptpercent || unsetopt promptpercent
  [[ $_promptly_saved_subst == on ]] && setopt promptsubst || unsetopt promptsubst
  [[ $_promptly_saved_bang == on ]] && setopt promptbang || unsetopt promptbang
  unset _promptly_active _promptly_width _promptly_frame _promptly_rights _promptly_saved_prompt _promptly_saved_rprompt _promptly_saved_ps2
  unset _promptly_saved_percent _promptly_saved_subst _promptly_saved_bang
  unfunction _promptly_paint _promptly_wire _promptly_build _promptly_expand _promptly_precmd _promptly_redraw promptly_off
  return 0
}

setopt promptpercent promptsubst
unsetopt promptbang
autoload -Uz add-zsh-hook
add-zsh-hook -d precmd _promptly_precmd
add-zsh-hook precmd _promptly_precmd
if [[ -o interactive ]]; then
  autoload -Uz add-zle-hook-widget
  add-zle-hook-widget -d line-pre-redraw _promptly_redraw
  add-zle-hook-widget line-pre-redraw _promptly_redraw
fi
_promptly_build
typeset -ga _promptly_rights
_promptly_rights=( '' '%F{#9b7570}%f' )
PROMPT='$(_promptly_expand)'
RPROMPT='${_promptly_rights[$(( COLUMNS >= 80 ? 2 : 1 ))]}'
