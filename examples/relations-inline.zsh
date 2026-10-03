# Promptly / standalone generative zsh prompt
# Recipe: {"version":6,"seed":"relations/2","style":"compose","palette":"generated","complexity":7,"glyphs":"powerline","label":"","info":true,"material":"rounded","alphabet":"granular","symmetry":"none","height":1,"density":0.421,"ornamentSeed":"relations/2","engine":"surface","spread":0.571,"fragments":1,"connectivity":0,"weight":0.8,"colorSeed":"relations/2","colors":["#5d686e","#71888e","#7aa4ba","#a683a2","#6ba4b2","#dce1e4","#142226"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":232.102147,"hueSpread":98.514491,"balance":-0.176685,"chroma":0.071306,"lightness":0.667877,"lightnessSpread":0.089314,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.50975,"chroma":0.017113,"hue":232.102147,"hex":"#5d686e"},{"role":"line","lightness":0.611159,"chroma":0.028522,"hue":214.696114,"hex":"#71888e"},{"role":"accent1","lightness":0.694758,"chroma":0.056309,"hue":232.102147,"hex":"#7aa4ba"},{"role":"accent2","lightness":0.652826,"chroma":0.060674,"hue":330.616638,"hex":"#a683a2"},{"role":"accent3","lightness":0.684756,"chroma":0.063243,"hue":214.696114,"hex":"#6ba4b2"},{"role":"text","lightness":0.907726,"chroma":0.007131,"hue":232.102147,"hex":"#dce1e4"},{"role":"surface","lightness":0.242097,"chroma":0.021113,"hue":214.696114,"hex":"#142226"}]}}
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
  '%F{#6ba4b2}>%f%b%k'
  '%F{#6ba4b2}> %f%b%k'
  '%F{#7aa4ba}%8<..<%n%<<%1(l.. )%2(l.. )%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%F{#5d686e} / %F{#a683a2}%16<..<%~%<<%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%f%b%k
%F{#6ba4b2}› %f%b%k'
  ' %F{#7aa4ba}│%8<..<%n%<<%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%9(l.. )%10(l.. )    %F{#a683a2}%19<..<%~%<<%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%28(l.. )%29(l.. )%30(l.. )%31(l.. )%32(l.. )%33(l.. )  %F{#6ba4b2}› %f%b%k'
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
PS2='%F{#71888e}... %f'
