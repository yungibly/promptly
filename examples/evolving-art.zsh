# Promptly / standalone generative zsh prompt
# Recipe: {"version":7,"seed":"evolving-art/12","style":"compose","palette":"generated","complexity":9,"glyphs":"unicode","label":"","info":true,"material":"rounded","alphabet":"technical","symmetry":"mirror","height":8,"density":0.547,"ornamentSeed":"evolving-art/12","engine":"assembly","spread":0.884,"fragments":5,"connectivity":0,"weight":0.86,"artSeed":"evolving-art/12","layoutSeed":"evolving-art/12","roleSeed":"evolving-art/12","motifSeed":"evolving-art/12","interactionSeed":"evolving-art/12","fragmentSeeds":{"piece:0":"evolving-art/12/piece:0","piece:1":"evolving-art/12/piece:1","piece:2":"evolving-art/12/piece:2"},"colorSeed":"evolving-art/12","colors":["#6a6c72","#747982","#8f9bb6","#9b8b7c","#8994aa","#eeeff2","#181b21"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":266.587444,"hueSpread":157.47629,"balance":-0.010519,"chroma":0.039204,"lightness":0.646308,"lightnessSpread":0.106303,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.53156,"chroma":0.009409,"hue":266.587444,"hex":"#6a6c72"},{"role":"line","lightness":0.574441,"chroma":0.015682,"hue":264.930951,"hex":"#747982"},{"role":"accent1","lightness":0.689147,"chroma":0.041782,"hue":266.587444,"hex":"#8f9bb6"},{"role":"accent2","lightness":0.646698,"chroma":0.029395,"hue":64.063734,"hex":"#9b8b7c"},{"role":"accent3","lightness":0.664536,"chroma":0.036054,"hue":264.930951,"hex":"#8994aa"},{"role":"text","lightness":0.95218,"chroma":0.00392,"hue":266.587444,"hex":"#eeeff2"},{"role":"surface","lightness":0.220285,"chroma":0.013409,"hue":264.930951,"hex":"#181b21"}]}}
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
  '%F{#8994aa}>%f%b%k'
  '%F{#8994aa}> %f%b%k'
  '%F{#8f9bb6}%8<..<%n%<<%1(l.. )%2(l.. )%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%F{#6a6c72} / %F{#9b8b7c}%16<..<%~%<<%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%f%b%k
%F{#8994aa}› %f%b%k'
  '${(l:(103*(_promptly_w-1)/1000-2)-(0):: :)}%F{#8f9bb6}╶╲──╴${(l:(897*(_promptly_w-1)/1000-1)-(103*(_promptly_w-1)/1000+3):: :)}╶──╱╴%f%b%k
${(l:(103*(_promptly_w-1)/1000+1)-(0):: :)}%F{#8f9bb6}─╴${(l:(346*(_promptly_w-1)/1000-7)-(103*(_promptly_w-1)/1000+3):: :)}%F{#747982}5BBB  %F{#6a6c72}5BBB   %F{#9b8b7c}55B${(l:(654*(_promptly_w-1)/1000-7)-(346*(_promptly_w-1)/1000+9):: :)}B55   %F{#6a6c72}BBB5  %F{#747982}BBB5${(l:(897*(_promptly_w-1)/1000-1)-(654*(_promptly_w-1)/1000+9):: :)}%F{#8f9bb6}╶─%f%b%k
 %f%b%k
${(l:(263*(_promptly_w-1)/1000-12)-(0):: :)}%F{#747982}╶─ %F{#6a6c72}─╴  ╶─ %F{#747982}─╴  ╶─ %F{#6a6c72}─╴  ╶─ %F{#747982}─╴${(l:(737*(_promptly_w-1)/1000-12)-(263*(_promptly_w-1)/1000+14):: :)}╶─ %F{#6a6c72}─╴  ╶─ %F{#747982}─╴  ╶─ %F{#6a6c72}─╴  ╶─ %F{#747982}─╴%f%b%k
${(l:(_promptly_w-78)-(0):: :)}%K{#181b21}%F{#ffffff} %F{#8f9bb6}%19<..<%~%<<%$(( _promptly_w-76 ))(l.. )%$(( _promptly_w-75 ))(l.. )%$(( _promptly_w-74 ))(l.. )%$(( _promptly_w-73 ))(l.. )%$(( _promptly_w-72 ))(l.. )%$(( _promptly_w-71 ))(l.. )%$(( _promptly_w-70 ))(l.. )%$(( _promptly_w-69 ))(l.. )%$(( _promptly_w-68 ))(l.. )%$(( _promptly_w-67 ))(l.. )%$(( _promptly_w-66 ))(l.. )%$(( _promptly_w-65 ))(l.. )%$(( _promptly_w-64 ))(l.. )%$(( _promptly_w-63 ))(l.. )%$(( _promptly_w-62 ))(l.. )%$(( _promptly_w-61 ))(l.. )%$(( _promptly_w-60 ))(l.. )%$(( _promptly_w-59 ))(l.. )%$(( _promptly_w-58 ))(l.. )%k   %K{#181b21}%F{#9b8b7c}%8<..<%n%<<%$(( _promptly_w-54 ))(l.. )%$(( _promptly_w-53 ))(l.. )%$(( _promptly_w-52 ))(l.. )%$(( _promptly_w-51 ))(l.. )%$(( _promptly_w-50 ))(l.. )%$(( _promptly_w-49 ))(l.. )%$(( _promptly_w-48 ))(l.. )%$(( _promptly_w-47 ))(l.. )%F{#ffffff} %k%F{#181b21}▶%f%b%k
${(l:(263*(_promptly_w-1)/1000-10)-(0):: :)}%F{#8f9bb6}╱╴   ╱╲ ╳    ╳ ╱╲   ╶╲${(l:(737*(_promptly_w-1)/1000-10)-(263*(_promptly_w-1)/1000+12):: :)}╱╴   ╱╲ ╳    ╳ ╱╲   ╶╲%f%b%k
${(l:(263*(_promptly_w-1)/1000-12)-(0):: :)}%F{#8f9bb6}╶     ╱  ╳ ╲  ╱ ╳  ╲     ╴${(l:(737*(_promptly_w-1)/1000-12)-(263*(_promptly_w-1)/1000+14):: :)}╶     ╱  ╳ ╲  ╱ ╳  ╲     ╴%f%b%k
%F{#8994aa}› %f%b%k'
)
typeset -ga _promptly_rights=( '' '%F{#747982}4-0-6-4-0-6%f' )

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
PROMPT='${(e)_promptly_frames[$((_promptly_w=(${COLUMNS:-80}<2?1:${COLUMNS:-80}>1001?1000:${COLUMNS:-80}-1),(_promptly_w<=26?(_promptly_w<=1?1:2):(_promptly_w<=78?3:4))))]}'
RPROMPT='${_promptly_rights[$(( ${COLUMNS:-80} >= 80 ? 2 : 1 ))]}'
PS2='%F{#747982}... %f'
