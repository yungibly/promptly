# Promptly / standalone generative zsh prompt
# Recipe: {"version":6,"seed":"relations/3","style":"compose","palette":"generated","complexity":8,"glyphs":"unicode","label":"","info":true,"material":"rounded","alphabet":"technical","symmetry":"none","height":1,"density":0.433,"ornamentSeed":"relations/3","engine":"prompt","spread":0.288,"fragments":3,"connectivity":0.783,"weight":0.15,"colorSeed":"relations/3","colors":["#6d6463","#a08f8e","#c79b97","#b4bd9a","#c4a6a4","#ede8e8","#291f1f"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":24.376518,"hueSpread":95.520598,"balance":-0.020456,"chroma":0.049948,"lightness":0.760151,"lightnessSpread":0.079188,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.511776,"chroma":0.011988,"hue":24.376518,"hex":"#6d6463"},{"role":"line","lightness":0.665421,"chroma":0.019979,"hue":22.422549,"hex":"#a08f8e"},{"role":"accent1","lightness":0.729732,"chroma":0.052321,"hue":24.376518,"hex":"#c79b97"},{"role":"accent2","lightness":0.781858,"chroma":0.04955,"hue":119.897116,"hex":"#b4bd9a"},{"role":"accent3","lightness":0.751616,"chroma":0.035563,"hue":22.422549,"hex":"#c4a6a4"},{"role":"text","lightness":0.934844,"chroma":0.004995,"hue":24.376518,"hex":"#ede8e8"},{"role":"surface","lightness":0.251895,"chroma":0.015988,"hue":22.422549,"hex":"#291f1f"}]}}
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
  '%F{#c4a6a4}>%f%b%k'
  '%F{#c4a6a4}> %f%b%k'
  '%F{#c79b97}%8<..<%n%<<%1(l.. )%2(l.. )%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%F{#6d6463} / %F{#b4bd9a}%16<..<%~%<<%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%f%b%k
%F{#c4a6a4}› %f%b%k'
  '  %F{#b4bd9a}%18<..<%~%<<%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%9(l.. )%10(l.. )%11(l.. )%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )  %F{#c79b97}%8<..<%n%<<%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%28(l.. )%29(l.. )%30(l.. )%F{#b4bd9a}│ %F{#c4a6a4}❯ %f%b%k'
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
PS2='%F{#a08f8e}... %f'
