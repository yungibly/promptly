# Promptly / standalone generative zsh prompt
# Recipe: {"version":7,"seed":"asymmetric-caps/1","style":"compose","palette":"generated","complexity":8,"glyphs":"powerline","label":"","info":true,"material":"double","alphabet":"granular","symmetry":"none","height":1,"density":0.488,"ornamentSeed":"asymmetric-caps/1","engine":"surface","spread":0.866,"fragments":4,"connectivity":0,"weight":1,"artSeed":"asymmetric-caps/1","layoutSeed":"asymmetric-caps/1","roleSeed":"asymmetric-caps/1","motifSeed":"asymmetric-caps/1","interactionSeed":"asymmetric-caps/1","fragmentSeeds":{},"colorSeed":"asymmetric-caps/1","colors":["#836c5f","#878259","#f19c66","#4dbdb0","#c2b239","#eadfd9","#25220a"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":52.102383,"hueSpread":132.56157,"balance":0.373921,"chroma":0.14563,"lightness":0.750042,"lightnessSpread":0.039258,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.549628,"chroma":0.034951,"hue":52.102383,"hex":"#836c5f"},{"role":"line","lightness":0.599242,"chroma":0.058252,"hue":101.669938,"hex":"#878259"},{"role":"accent1","lightness":0.766829,"chroma":0.123824,"hue":52.102383,"hex":"#f19c66"},{"role":"accent2","lightness":0.73207,"chroma":0.103299,"hue":184.663953,"hex":"#4dbdb0"},{"role":"accent3","lightness":0.755162,"chroma":0.137794,"hue":101.669938,"hex":"#c2b239"},{"role":"text","lightness":0.911023,"chroma":0.014563,"hue":52.102383,"hex":"#eadfd9"},{"role":"surface","lightness":0.248139,"chroma":0.038951,"hue":101.669938,"hex":"#25220a"}]}}
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
  '%F{#c2b239}>%f%b%k'
  '%F{#c2b239}> %f%b%k'
  '%F{#f19c66}%8<..<%n%<<%1(l.. )%2(l.. )%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%F{#836c5f} / %F{#4dbdb0}%16<..<%~%<<%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%f%b%k
%F{#c2b239}› %f%b%k'
  '%F{#4dbdb0}%K{#4dbdb0}%F{#000000} %8<..<%n%<<%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%9(l.. )%10(l.. )%k  %K{#4dbdb0}%18<..<%~%<<%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%28(l.. )%29(l.. )%30(l.. ) %k%F{#4dbdb0}%F{#c2b239}› %f%b%k'
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
PS2='%F{#878259}... %f'
