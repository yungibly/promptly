# Promptly / standalone generative zsh prompt
# Recipe: {"version":6,"seed":"relations/1","style":"compose","palette":"generated","complexity":3,"glyphs":"powerline","label":"","info":true,"material":"square","alphabet":"granular","symmetry":"none","height":1,"density":0.576,"ornamentSeed":"relations/1","engine":"surface","spread":0.526,"fragments":3,"connectivity":0,"weight":0.35,"colorSeed":"relations/1","colors":["#666151","#7e8264","#b9a459","#8cc37b","#a7b151","#e3e1d9","#191b0a"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":94.047329,"hueSpread":44.272644,"balance":0.464787,"chroma":0.108799,"lightness":0.743402,"lightnessSpread":0.051547,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.492688,"chroma":0.026112,"hue":94.047329,"hex":"#666151"},{"role":"line","lightness":0.595133,"chroma":0.04352,"hue":114.624678,"hex":"#7e8264"},{"role":"accent1","lightness":0.720866,"chroma":0.09847,"hue":94.047329,"hex":"#b9a459"},{"role":"accent2","lightness":0.760211,"chroma":0.114149,"hue":138.319973,"hex":"#8cc37b"},{"role":"accent3","lightness":0.732955,"chroma":0.121805,"hue":114.624678,"hex":"#a7b151"},{"role":"text","lightness":0.907734,"chroma":0.01088,"hue":94.047329,"hex":"#e3e1d9"},{"role":"surface","lightness":0.214204,"chroma":0.030112,"hue":114.624678,"hex":"#191b0a"}]}}
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
  '%F{#a7b151}>%f%b%k'
  '%F{#a7b151}> %f%b%k'
  '%F{#b9a459}%8<..<%n%<<%1(l.. )%2(l.. )%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%F{#666151} / %F{#8cc37b}%16<..<%~%<<%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%f%b%k
%F{#a7b151}› %f%b%k'
  '  %F{#b9a459}%8<..<%n%<<%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%9(l.. )%10(l.. )│     %F{#8cc37b}%18<..<%~%<<%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%28(l.. )%29(l.. )%30(l.. )%31(l.. )%32(l.. )%33(l.. )%34(l.. )│ %F{#a7b151}> %f%b%k'
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
PS2='%F{#7e8264}... %f'
