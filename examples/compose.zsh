# Promptly / standalone generative zsh prompt
# Recipe: {"version":4,"seed":"closely/6","style":"compose","palette":"abyss","complexity":8,"glyphs":"unicode","label":"finn","material":"dashed","alphabet":"punctuation","symmetry":"none","height":3,"density":0.351,"ornamentSeed":"closely/6","engine":"prompt","spread":0.749,"fragments":4,"connectivity":0.749}
# Precompiled text; zsh pads the gaps on resize. Undo with promptly_off.
[[ -n ${ZSH_VERSION-} ]] || { printf '%s\n' 'Promptly requires zsh.' >&2; return 1; }

# Retire the renderer when replacing a prompt exported by Promptly < 0.6.
(( ${+functions[_promptly_build]} )) && promptly_off
if (( ! ${+_promptly_active} )); then
  typeset -ga _promptly_saved=( "$PROMPT" "$RPROMPT" "$PS2"
    "$options[promptpercent]" "$options[promptsubst]" "$options[promptbang]" "$options[multibyte]" )
fi
typeset -g _promptly_active=1
unset _promptly_rows
unset -m '_promptly_text<->'

typeset -ga _promptly_frames=(
  '%F{#ddcdb0}>%f%b%k'
  '%F{#ddcdb0}> %f%b%k'
  '%F{#75dce3}╭─ finn  %F{#3c626e}${(l:(_promptly_w-6)-(9)::·:)}   %F{#9bc9a1}⟨◈⟩%f%b%k
%F{#648f9b}╰─ %F{#ddcdb0}◈ %f%b%k'
  ' %F{#9bc9a1}. %F{#648f9b}╱╱%F{#75dce3}finn%F{#648f9b}╷ %F{#ddcdb0}+-+-+  %F{#9bc9a1}+  %F{#3c626e}╶${(l:(_promptly_w-7)-(22)::┄:)}╴  %F{#9bc9a1}[!]%f%b%k
   %F{#648f9b}┆╶┄┄%F{#ddcdb0}+%F{#648f9b}┄╯%f%b%k
   %F{#648f9b}╰╴%F{#9bc9a1}= %F{#ddcdb0}> %f%b%k'
)
typeset -ga _promptly_rights=( '' '%F{#648f9b}[!.!]%f' )

promptly_off() {
  PROMPT=$_promptly_saved[1] RPROMPT=$_promptly_saved[2] PS2=$_promptly_saved[3]
  [[ $_promptly_saved[4] == on ]] && setopt promptpercent || unsetopt promptpercent
  [[ $_promptly_saved[5] == on ]] && setopt promptsubst || unsetopt promptsubst
  [[ $_promptly_saved[6] == on ]] && setopt promptbang || unsetopt promptbang
  [[ $_promptly_saved[7] == on ]] && setopt multibyte || unsetopt multibyte
  unset _promptly_active _promptly_saved _promptly_frames _promptly_rows _promptly_rights _promptly_w
  unset -m '_promptly_text<->'
  unfunction promptly_off
  return 0
}

setopt promptpercent promptsubst multibyte
unsetopt promptbang
PROMPT='${(e)_promptly_frames[$((_promptly_w=(${COLUMNS:-80}<2?1:${COLUMNS:-80}>1001?1000:${COLUMNS:-80}-1),_promptly_w<=1?1:_promptly_w<=26?2:_promptly_w<=78?3:4))]}'
RPROMPT='${_promptly_rights[$(( ${COLUMNS:-80} >= 80 ? 2 : 1 ))]}'
PS2='%F{#648f9b}... %f'
