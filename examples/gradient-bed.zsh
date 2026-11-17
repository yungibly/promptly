# Promptly / standalone generative zsh prompt
# Recipe: {"version":8,"seed":"first-light/4","style":"compose","palette":"generated","complexity":2,"glyphs":"unicode","label":"","info":true,"material":"dashed","alphabet":"granular","symmetry":"none","height":1,"density":0.435,"ornamentSeed":"first-light/4","engine":"field","spread":0.721,"fragments":3,"connectivity":0,"weight":0.01,"artSeed":"first-light/4","layoutSeed":"first-light/4","roleSeed":"first-light/4","motifSeed":"first-light/4","interactionSeed":"first-light/4","fragmentSeeds":{},"colorSeed":"first-light/4","colors":["#5f687d","#9387ad","#84a7fb","#c99f00","#b9a1e9","#dee3ed","#1c1529"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":265.951745,"hueSpread":184.014047,"balance":0.181709,"chroma":0.144297,"lightness":0.740073,"lightnessSpread":0.040814,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.517658,"chroma":0.034631,"hue":265.951745,"hex":"#5f687d"},{"role":"line","lightness":0.646249,"chroma":0.057719,"hue":299.388753,"hex":"#9387ad"},{"role":"accent1","lightness":0.737114,"chroma":0.128461,"hue":265.951745,"hex":"#84a7fb"},{"role":"accent2","lightness":0.720728,"chroma":0.147285,"hue":89.965792,"hex":"#c99f00"},{"role":"accent3","lightness":0.755523,"chroma":0.104962,"hue":299.388753,"hex":"#b9a1e9"},{"role":"text","lightness":0.915492,"chroma":0.01443,"hue":265.951745,"hex":"#dee3ed"},{"role":"surface","lightness":0.215178,"chroma":0.038631,"hue":299.388753,"hex":"#1c1529"}]}}
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
  '%F{#b9a1e9}>%f%b%k'
  '%F{#b9a1e9}> %f%b%k'
  '%F{#84a7fb}%8>..>%n%>>%F{#5f687d} / %F{#c99f00}%16<..<%~%<<%f%b%k
%F{#b9a1e9}› %f%b%k'
  '%K{#8e7ab4}%F{#8e7ab4} %F{#000000}%8>..>%n%>> %K{#776a92}%F{#ffffff}%20<..<%~%<<%5(l.. )%6(l.. )%7(l.. )%8(l.. )%9(l.. )%10(l.. )%11(l.. )%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%28(l.. )%29(l.. )%30(l.. )%31(l.. )%K{#34354a}%F{#34354a} %F{#404157}▀▀▀▀%k %F{#b9a1e9}❯ %f%b%k'
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
PROMPT='${_promptly_frames[$((_promptly_w=(${COLUMNS:-80}<2?1:${COLUMNS:-80}>1001?1000:${COLUMNS:-80}-1),(_promptly_w<=26?(_promptly_w<=1?1:2):(_promptly_w<=78?3:4))))]}'
RPROMPT='${_promptly_rights[$(( ${COLUMNS:-80} >= 80 ? 2 : 1 ))]}'
PS2='%F{#9387ad}... %f'
