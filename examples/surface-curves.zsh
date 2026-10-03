# Promptly / standalone generative zsh prompt
# Recipe: {"version":5,"seed":"curves/14","style":"compose","palette":"primary","complexity":8,"glyphs":"unicode","label":"","info":true,"material":"dashed","alphabet":"punctuation","symmetry":"none","height":3,"density":0.584,"ornamentSeed":"curves/14","engine":"surface","spread":0.268,"fragments":4,"connectivity":0}
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
  '%F{#f3c83d}>%f%b%k'
  '%F{#f3c83d}> %f%b%k'
  '%F{#ef414b}%8<..<%n%<<%1(l.. )%2(l.. )%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%F{#626977} / %F{#356ee8}%16<..<%~%<<%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%f%b%k
%F{#f3c83d}› %f%b%k'
  '%F{#626977}╱%K{#626977}%F{#ffffff} %k%F{#f3c83d}▄%K{#626977}%F{#ffffff}  %k%F{#f3c83d}▄%K{#626977}%F{#ffffff}   %k%F{#626977}╲ ▗▄%F{#ef414b}▄%F{#626977}▄▄%F{#ef414b}▄%F{#626977}▄▄%F{#ef414b}▄%F{#626977}▄▄▄▄▄▄▄▄▄▄▖%f%b%k
%K{#626977}%F{#ffffff} %8<..<%n%<<%2(l.. )%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%9(l.. ) %k %F{#626977}▐%K{#626977}%F{#ffffff}%18<..<%~%<<%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%28(l.. )%29(l.. )%30(l.. )%k%F{#626977}▌%f%b%k
%F{#626977}╲%K{#626977}%F{#ffffff}        %k%F{#626977}╱ ▝▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▘ %F{#f3c83d}❯ %f%b%k'
)
typeset -ga _promptly_rights=( '' '' )

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
PROMPT='${_promptly_frames[$((_promptly_w=(${COLUMNS:-80}<2?1:${COLUMNS:-80}>1001?1000:${COLUMNS:-80}-1),_promptly_w<=1?1:_promptly_w<=26?2:_promptly_w<=78?3:4))]}'
RPROMPT='${_promptly_rights[$(( ${COLUMNS:-80} >= 80 ? 2 : 1 ))]}'
PS2='%F{#929aaa}... %f'
