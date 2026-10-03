# Promptly / standalone generative zsh prompt
# Recipe: {"version":6,"seed":"audit/349","style":"compose","palette":"generated","complexity":7,"glyphs":"powerline","label":"","info":true,"material":"double","alphabet":"granular","symmetry":"mirror","height":1,"density":0.497,"ornamentSeed":"audit/349","engine":"surface","spread":0.974,"fragments":3,"connectivity":0,"weight":0.999,"colorSeed":"audit/349","colors":["#4a6e5c","#5295b4","#00a26e","#867dfd","#0099c9","#dfefe6","#001823"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":162.014008,"hueSpread":121.311955,"balance":0.558534,"chroma":0.206221,"lightness":0.648263,"lightnessSpread":0.139061,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.504543,"chroma":0.049493,"hue":162.014008,"hex":"#4a6e5c"},{"role":"line","lightness":0.639072,"chroma":0.082488,"hue":229.770859,"hex":"#5295b4"},{"role":"accent1","lightness":0.628307,"chroma":0.137766,"hue":162.014008,"hex":"#00a26e"},{"role":"accent2","lightness":0.659655,"chroma":0.184504,"hue":283.325963,"hex":"#867dfd"},{"role":"accent3","lightness":0.639102,"chroma":0.12703,"hue":229.770859,"hex":"#0099c9"},{"role":"text","lightness":0.936426,"chroma":0.020622,"hue":162.014008,"hex":"#dfefe6"},{"role":"surface","lightness":0.196803,"chroma":0.039117,"hue":229.770859,"hex":"#001823"}]}}
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
  '%F{#0099c9}>%f%b%k'
  '%F{#0099c9}> %f%b%k'
  '%F{#00a26e}%8<..<%n%<<%1(l.. )%2(l.. )%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%F{#4a6e5c} / %F{#867dfd}%16<..<%~%<<%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%f%b%k
%F{#0099c9}› %f%b%k'
  '%F{#0099c9}%K{#0099c9}%F{#000000} %8<..<%n%<<%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%9(l.. )%10(l.. ) %k%F{#0099c9}%F{#001823}%K{#001823}%F{#ffffff} %F{#867dfd}%20<..<%~%<<%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%28(l.. )%29(l.. )%30(l.. )%31(l.. )%32(l.. )%33(l.. )%34(l.. )%F{#ffffff} %k%F{#001823}%F{#0099c9}❯ %f%b%k'
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
PS2='%F{#5295b4}... %f'
