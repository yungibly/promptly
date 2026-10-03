# Promptly / standalone generative zsh prompt
# Recipe: {"version":1,"seed":"first-contact/1","style":"signal","palette":"phosphor","complexity":3,"glyphs":"unicode","label":"finn"}
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

_promptly_build() {
  emulate -L zsh
  setopt multibyte
  local -i _pp_w=$(( ${COLUMNS:-80} - 1 ))
  # Leave the final column unused to avoid autowrap. Bound work in unusual PTYs.
  (( _pp_w < 1 )) && _pp_w=1
  (( _pp_w > 1000 )) && _pp_w=1000
  local -a _pp_cells _pp_inks _pp_colors
  _pp_colors=( '#536573' '#779197' '#81efc5' '#bf91f3' '#e9ed9a' '#dce8e6' )
  local -i _pp_height _pp_cursor
  local _pp_right
  if (( _pp_w >= 79 )); then
    _pp_height=3
    _pp_cursor=5
    _pp_right='⟨ · ⌬ · ⟩'
    _promptly_paint 0 "$(( (0 * (_pp_w - 1) / 1000 + (2)) ))" "$(( (361 * (_pp_w - 1) / 1000 + (0)) - (0 * (_pp_w - 1) / 1000 + (2)) ))" 0 '─'
    _promptly_paint 0 "$(( (0 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 2 ))" 1 '╭─'
    _promptly_paint 0 "$(( (0 * (_pp_w - 1) / 1000 + (3)) ))" "$(( 8 ))" 2 '⟨⌬:finn⟩'
    _promptly_paint 0 "$(( (361 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 1 '╮'
    _promptly_paint 1 "$(( (361 * (_pp_w - 1) / 1000 + (0)) ))" "$(( (730 * (_pp_w - 1) / 1000 + (0)) - (361 * (_pp_w - 1) / 1000 + (0)) ))" 0 '─'
    _promptly_paint 1 "$(( (361 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 1 '╰'
    _promptly_paint 1 "$(( (730 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 1 '╮'
    _promptly_paint 0 "$(( (730 * (_pp_w - 1) / 1000 + (0)) ))" "$(( (1000 * (_pp_w - 1) / 1000 + (-1)) - (730 * (_pp_w - 1) / 1000 + (0)) ))" 0 '·'
    _promptly_paint 0 "$(( (730 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 1 '╭'
    _promptly_paint 0 "$(( (1000 * (_pp_w - 1) / 1000 + (0)) - 10 ))" "$(( 11 ))" 3 '⟦ NULL:50 ⟧'
    _promptly_paint 1 "$(( (0 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 1 '│'
    _promptly_paint 1 "$(( (0 * (_pp_w - 1) / 1000 + (3)) ))" "$(( 11 ))" 3 'ᚷ ᚠ ᚹ  ⌁  ◈'
    _promptly_paint 1 "$(( (540 * (_pp_w - 1) / 1000 + (0)) - 4 ))" "$(( 9 ))" 4 ' ⊣ ᚨ ᛚ ⊢ '
    _promptly_paint 1 "$(( (730 * (_pp_w - 1) / 1000 + (0)) ))" "$(( (1000 * (_pp_w - 1) / 1000 + (0)) - (730 * (_pp_w - 1) / 1000 + (0)) ))" 0 '─'
    _promptly_paint 1 "$(( (730 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 1 '┴'
    _promptly_paint 1 "$(( (1000 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 1 ))" 1 '╯'
    if (( _pp_w >= 100 )); then _promptly_paint 0 "$(( (230 * (_pp_w - 1) / 1000 + (0)) - 3 ))" "$(( 7 ))" 4 ' ╴╴◈╶╶ '; fi
    if (( _pp_w >= 100 )); then _promptly_paint 1 "$(( (880 * (_pp_w - 1) / 1000 + (0)) - 2 ))" "$(( 5 ))" 3 ' ᛚ ᚲ '; fi
    _promptly_paint 2 "$(( (0 * (_pp_w - 1) / 1000 + (0)) ))" "$(( 2 ))" 1 '╰─'
    _promptly_paint 2 "$(( (0 * (_pp_w - 1) / 1000 + (3)) ))" "$(( 1 ))" 4 '◈'
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
  unfunction _promptly_paint _promptly_build _promptly_expand _promptly_precmd _promptly_redraw promptly_off
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
_promptly_rights=( '' '%F{#779197}⟨ · ⌬ · ⟩%f' )
PROMPT='$(_promptly_expand)'
RPROMPT='${_promptly_rights[$(( COLUMNS >= 80 ? 2 : 1 ))]}'
