# Promptly / standalone generative zsh prompt
# Recipe: {"version":6,"seed":"working-art","style":"compose","palette":"generated","complexity":8,"glyphs":"unicode","label":"","info":true,"material":"dashed","alphabet":"technical","symmetry":"none","height":6,"density":0.468,"ornamentSeed":"working-art","engine":"network","weight":0.959,"colorSeed":"working-art","colors":["#7d7a80","#837d88","#a99fb4","#a490b0","#9c8da8","#f0eff2","#2b272e"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":307.600658,"hueSpread":4.793142,"balance":0.513562,"chroma":0.045963,"lightness":0.713461,"lightnessSpread":0.117649,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.583327,"chroma":0.011031,"hue":307.600658,"hex":"#7d7a80"},{"role":"line","lightness":0.598022,"chroma":0.018385,"hue":310.062234,"hex":"#837d88"},{"role":"accent1","lightness":0.717272,"chroma":0.03249,"hue":307.600658,"hex":"#a99fb4"},{"role":"accent2","lightness":0.682027,"chroma":0.051141,"hue":312.3938,"hex":"#a490b0"},{"role":"accent3","lightness":0.666032,"chroma":0.042459,"hue":310.062234,"hex":"#9c8da8"},{"role":"text","lightness":0.952979,"chroma":0.004596,"hue":307.600658,"hex":"#f0eff2"},{"role":"surface","lightness":0.279765,"chroma":0.015031,"hue":310.062234,"hex":"#2b272e"}]}}
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

typeset -ga _promptly_rows=(
  '${(l:(275*(_promptly_w-1)/1000)-(0):: :)}%F{#7d7a80}1${(l:(425*(_promptly_w-1)/1000)-(275*(_promptly_w-1)/1000+1):: :)}%F{#837d88}╶${(l:(450*(_promptly_w-1)/1000)-(425*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(475*(_promptly_w-1)/1000)-(450*(_promptly_w-1)/1000+1)::┄:)}╴${(l:(575*(_promptly_w-1)/1000-1)-(475*(_promptly_w-1)/1000+1):: :)}%F{#7d7a80}(3)${(l:(675*(_promptly_w-1)/1000)-(575*(_promptly_w-1)/1000+2):: :)}%F{#837d88}╭${(l:(700*(_promptly_w-1)/1000)-(675*(_promptly_w-1)/1000+1)::┄:)}╮${(l:(750*(_promptly_w-1)/1000)-(700*(_promptly_w-1)/1000+1):: :)}%F{#7d7a80}4${(l:(825*(_promptly_w-1)/1000)-(750*(_promptly_w-1)/1000+1):: :)}%F{#9c8da8}8%F{#837d88}${(l:(875*(_promptly_w-1)/1000)-(825*(_promptly_w-1)/1000+1)::┄:)}╮%f%b%k'
  '${(l:(25*(_promptly_w-1)/1000)-(0):: :)}%F{#7d7a80}╭${(l:(200*(_promptly_w-1)/1000)-(25*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(275*(_promptly_w-1)/1000)-(200*(_promptly_w-1)/1000+1)::┄:)}╮${(l:(350*(_promptly_w-1)/1000-2)-(275*(_promptly_w-1)/1000+1):: :)}%F{#837d88}[<8>]${(l:(425*(_promptly_w-1)/1000)-(350*(_promptly_w-1)/1000+3):: :)}╭${(l:(450*(_promptly_w-1)/1000)-(425*(_promptly_w-1)/1000+1)::┄:)}┼${(l:(475*(_promptly_w-1)/1000)-(450*(_promptly_w-1)/1000+1)::┄:)}╴${(l:(575*(_promptly_w-1)/1000-1)-(475*(_promptly_w-1)/1000+1):: :)}A:A${(l:(675*(_promptly_w-1)/1000)-(575*(_promptly_w-1)/1000+2):: :)}┆${(l:(700*(_promptly_w-1)/1000)-(675*(_promptly_w-1)/1000+1):: :)}┆${(l:(775*(_promptly_w-1)/1000)-(700*(_promptly_w-1)/1000+1):: :)}%F{#7d7a80}2${(l:(825*(_promptly_w-1)/1000)-(775*(_promptly_w-1)/1000+1):: :)}%F{#837d88}╭${(l:(875*(_promptly_w-1)/1000)-(825*(_promptly_w-1)/1000+1)::┄:)}┤${(l:(925*(_promptly_w-1)/1000)-(875*(_promptly_w-1)/1000+1):: :)}%F{#7d7a80}A%f%b%k'
  ' %F{#837d88}┆${(l:(100*(_promptly_w-1)/1000-3)-(2):: :)}%F{#a490b0}(B)-(B)${(l:(225*(_promptly_w-1)/1000)-(100*(_promptly_w-1)/1000+4):: :)}%F{#7d7a80}┆${(l:(375*(_promptly_w-1)/1000)-(225*(_promptly_w-1)/1000+1):: :)}%F{#a490b0}0${(l:(450*(_promptly_w-1)/1000)-(375*(_promptly_w-1)/1000+1):: :)}%F{#837d88}╰${(l:(475*(_promptly_w-1)/1000)-(450*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(500*(_promptly_w-1)/1000)-(475*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(575*(_promptly_w-1)/1000)-(500*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(600*(_promptly_w-1)/1000)-(575*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(675*(_promptly_w-1)/1000)-(600*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(700*(_promptly_w-1)/1000)-(675*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(750*(_promptly_w-1)/1000)-(700*(_promptly_w-1)/1000+1)::┄:)}╯${(l:(775*(_promptly_w-1)/1000)-(750*(_promptly_w-1)/1000+1):: :)}%F{#a99fb4}9%F{#837d88}${(l:(825*(_promptly_w-1)/1000)-(775*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(850*(_promptly_w-1)/1000)-(825*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(900*(_promptly_w-1)/1000)-(850*(_promptly_w-1)/1000+1)::┄:)}╮${(l:(950*(_promptly_w-1)/1000)-(900*(_promptly_w-1)/1000+1):: :)}├${(l:(975*(_promptly_w-1)/1000)-(950*(_promptly_w-1)/1000+1)::┄:)}${(l:(_promptly_w-2)-(975*(_promptly_w-1)/1000)::┬:)}╴%f%b%k'
  ' %F{#837d88}┆${(l:(100*(_promptly_w-1)/1000-3)-(2):: :)}A/D:[F]${(l:(225*(_promptly_w-1)/1000)-(100*(_promptly_w-1)/1000+4):: :)}%F{#7d7a80}╰${(l:(250*(_promptly_w-1)/1000)-(225*(_promptly_w-1)/1000+1)::┄:)}%F{#a490b0}F${(l:(425*(_promptly_w-1)/1000-1)-(250*(_promptly_w-1)/1000+1):: :)}%F{#7d7a80}3-3${(l:(500*(_promptly_w-1)/1000)-(425*(_promptly_w-1)/1000+2):: :)}╰${(l:(575*(_promptly_w-1)/1000)-(500*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(650*(_promptly_w-1)/1000)-(575*(_promptly_w-1)/1000+1)::┄:)}%F{#a99fb4}B${(l:(750*(_promptly_w-1)/1000-1)-(650*(_promptly_w-1)/1000+1):: :)}%F{#837d88}B/2${(l:(850*(_promptly_w-1)/1000)-(750*(_promptly_w-1)/1000+2):: :)}%F{#a490b0}D${(l:(900*(_promptly_w-1)/1000)-(850*(_promptly_w-1)/1000+1):: :)}%F{#837d88}╰${(l:(950*(_promptly_w-1)/1000)-(900*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(975*(_promptly_w-1)/1000)-(950*(_promptly_w-1)/1000+1)::┄:)}╯%f%b%k'
  ' %F{#837d88}╰┄╴%F{#a99fb4}◖%K{#a99fb4}%F{#000000} %23<..<%~%<<%7(l.. )%8(l.. )%9(l.. )%10(l.. )%11(l.. )%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%28(l.. )%29(l.. ) %k%F{#a99fb4}◗   %F{#2b272e}◖%K{#2b272e}%F{#ffffff} %F{#a99fb4}%8<..<%n%<<%37(l.. )%38(l.. )%39(l.. )%40(l.. )%41(l.. )%42(l.. )%43(l.. )%44(l.. )%F{#ffffff} %k%F{#2b272e}◗%F{#9c8da8}❯ %f%b%k'
  ' %F{#837d88}╭${(l:(25*(_promptly_w-1)/1000+1)-(2)::┴:)}${(l:(200*(_promptly_w-1)/1000)-(25*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(225*(_promptly_w-1)/1000)-(200*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(275*(_promptly_w-1)/1000)-(225*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(425*(_promptly_w-1)/1000)-(275*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(450*(_promptly_w-1)/1000)-(425*(_promptly_w-1)/1000+1)::┄:)}┤${(l:(475*(_promptly_w-1)/1000)-(450*(_promptly_w-1)/1000+1):: :)}╭${(l:(500*(_promptly_w-1)/1000)-(475*(_promptly_w-1)/1000+1)::┄:)}%F{#a99fb4}9${(l:(600*(_promptly_w-1)/1000)-(500*(_promptly_w-1)/1000+1):: :)}%F{#837d88}╭${(l:(625*(_promptly_w-1)/1000)-(600*(_promptly_w-1)/1000+1)::┄:)}%F{#9c8da8}3${(l:(675*(_promptly_w-1)/1000)-(625*(_promptly_w-1)/1000+1):: :)}%F{#837d88}┆${(l:(700*(_promptly_w-1)/1000)-(675*(_promptly_w-1)/1000+1):: :)}┆${(l:(750*(_promptly_w-1)/1000)-(700*(_promptly_w-1)/1000+1):: :)}╭${(l:(825*(_promptly_w-1)/1000)-(750*(_promptly_w-1)/1000+1)::┄:)}┼${(l:(850*(_promptly_w-1)/1000)-(825*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(875*(_promptly_w-1)/1000)-(850*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(950*(_promptly_w-1)/1000)-(875*(_promptly_w-1)/1000+1)::┄:)}╮%f%b%k'
  ' %F{#837d88}┆${(l:(100*(_promptly_w-1)/1000-3)-(2):: :)}%F{#a490b0}(B)-(B)${(l:(225*(_promptly_w-1)/1000)-(100*(_promptly_w-1)/1000+4):: :)}%F{#7d7a80}┆${(l:(375*(_promptly_w-1)/1000)-(225*(_promptly_w-1)/1000+1):: :)}%F{#a490b0}0${(l:(450*(_promptly_w-1)/1000)-(375*(_promptly_w-1)/1000+1):: :)}%F{#837d88}╰${(l:(475*(_promptly_w-1)/1000)-(450*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(500*(_promptly_w-1)/1000)-(475*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(575*(_promptly_w-1)/1000)-(500*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(600*(_promptly_w-1)/1000)-(575*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(675*(_promptly_w-1)/1000)-(600*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(700*(_promptly_w-1)/1000)-(675*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(750*(_promptly_w-1)/1000)-(700*(_promptly_w-1)/1000+1)::┄:)}╯${(l:(775*(_promptly_w-1)/1000)-(750*(_promptly_w-1)/1000+1):: :)}%F{#a99fb4}9%F{#837d88}${(l:(825*(_promptly_w-1)/1000)-(775*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(850*(_promptly_w-1)/1000)-(825*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(900*(_promptly_w-1)/1000)-(850*(_promptly_w-1)/1000+1)::┄:)}╮${(l:(950*(_promptly_w-1)/1000)-(900*(_promptly_w-1)/1000+1):: :)}├${(l:(975*(_promptly_w-1)/1000)-(950*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(_promptly_w-2)-(975*(_promptly_w-1)/1000+1)::┄:)}╴%f%b%k'
)
typeset -ga _promptly_frames=(
  '%F{#9c8da8}>%f%b%k'
  '%F{#9c8da8}> %f%b%k'
  '%F{#a99fb4}%8<..<%n%<<%1(l.. )%2(l.. )%3(l.. )%4(l.. )%5(l.. )%6(l.. )%7(l.. )%8(l.. )%F{#7d7a80} / %F{#a490b0}%16<..<%~%<<%12(l.. )%13(l.. )%14(l.. )%15(l.. )%16(l.. )%17(l.. )%18(l.. )%19(l.. )%20(l.. )%21(l.. )%22(l.. )%23(l.. )%24(l.. )%25(l.. )%26(l.. )%27(l.. )%f%b%k
%F{#9c8da8}› %f%b%k'
  '${(e)_promptly_rows[1]}
${(e)_promptly_rows[2]}
 %F{#837d88}├${(l:(200*(_promptly_w-1)/1000)-(2)::┄:)}┴${(l:(225*(_promptly_w-1)/1000)-(200*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(275*(_promptly_w-1)/1000)-(225*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(425*(_promptly_w-1)/1000)-(275*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(450*(_promptly_w-1)/1000)-(425*(_promptly_w-1)/1000+1)::┄:)}┤${(l:(475*(_promptly_w-1)/1000)-(450*(_promptly_w-1)/1000+1):: :)}╭${(l:(500*(_promptly_w-1)/1000)-(475*(_promptly_w-1)/1000+1)::┄:)}%F{#a99fb4}9${(l:(600*(_promptly_w-1)/1000)-(500*(_promptly_w-1)/1000+1):: :)}%F{#837d88}╭${(l:(625*(_promptly_w-1)/1000)-(600*(_promptly_w-1)/1000+1)::┄:)}%F{#9c8da8}3${(l:(675*(_promptly_w-1)/1000)-(625*(_promptly_w-1)/1000+1):: :)}%F{#837d88}┆${(l:(700*(_promptly_w-1)/1000)-(675*(_promptly_w-1)/1000+1):: :)}┆${(l:(750*(_promptly_w-1)/1000)-(700*(_promptly_w-1)/1000+1):: :)}╭${(l:(825*(_promptly_w-1)/1000)-(750*(_promptly_w-1)/1000+1)::┄:)}┼${(l:(850*(_promptly_w-1)/1000)-(825*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(875*(_promptly_w-1)/1000)-(850*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(950*(_promptly_w-1)/1000)-(875*(_promptly_w-1)/1000+1)::┄:)}╮%f%b%k
${(e)_promptly_rows[3]}
${(e)_promptly_rows[4]}
${(e)_promptly_rows[5]}'
  '${(e)_promptly_rows[1]}
${(e)_promptly_rows[2]}
${(e)_promptly_rows[6]}
${(e)_promptly_rows[3]}
${(e)_promptly_rows[4]}
${(e)_promptly_rows[5]}'
  '${(e)_promptly_rows[1]}
${(e)_promptly_rows[2]}
${(e)_promptly_rows[6]}
${(e)_promptly_rows[7]}
${(e)_promptly_rows[4]}
${(e)_promptly_rows[5]}'
  '${(e)_promptly_rows[1]}
${(e)_promptly_rows[2]}
 %F{#837d88}╭${(l:(25*(_promptly_w-1)/1000)-(2)::┄:)}┴${(l:(200*(_promptly_w-1)/1000)-(25*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(225*(_promptly_w-1)/1000)-(200*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(275*(_promptly_w-1)/1000)-(225*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(425*(_promptly_w-1)/1000)-(275*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(450*(_promptly_w-1)/1000)-(425*(_promptly_w-1)/1000+1)::┄:)}┤${(l:(475*(_promptly_w-1)/1000)-(450*(_promptly_w-1)/1000+1):: :)}╭${(l:(500*(_promptly_w-1)/1000)-(475*(_promptly_w-1)/1000+1)::┄:)}%F{#a99fb4}9${(l:(600*(_promptly_w-1)/1000)-(500*(_promptly_w-1)/1000+1):: :)}%F{#837d88}╭${(l:(625*(_promptly_w-1)/1000)-(600*(_promptly_w-1)/1000+1)::┄:)}%F{#9c8da8}3${(l:(675*(_promptly_w-1)/1000)-(625*(_promptly_w-1)/1000+1):: :)}%F{#837d88}┆${(l:(700*(_promptly_w-1)/1000)-(675*(_promptly_w-1)/1000+1):: :)}┆${(l:(750*(_promptly_w-1)/1000)-(700*(_promptly_w-1)/1000+1):: :)}╭${(l:(825*(_promptly_w-1)/1000)-(750*(_promptly_w-1)/1000+1)::┄:)}┼${(l:(850*(_promptly_w-1)/1000)-(825*(_promptly_w-1)/1000+1)::┄:)}┬${(l:(875*(_promptly_w-1)/1000)-(850*(_promptly_w-1)/1000+1)::┄:)}┴${(l:(950*(_promptly_w-1)/1000)-(875*(_promptly_w-1)/1000+1)::┄:)}╮%f%b%k
${(e)_promptly_rows[7]}
${(e)_promptly_rows[4]}
${(e)_promptly_rows[5]}'
)
typeset -ga _promptly_rights=( '' '%F{#837d88}([A]-[A])%f' )

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
PROMPT='${(e)_promptly_frames[$((_promptly_w=(${COLUMNS:-80}<2?1:${COLUMNS:-80}>1001?1000:${COLUMNS:-80}-1),_promptly_w<=1?1:_promptly_w<=26?2:_promptly_w<=78?3:_promptly_w<=80?4:_promptly_w<=81?5:_promptly_w<=120?6:7))]}'
RPROMPT='${_promptly_rights[$(( ${COLUMNS:-80} >= 80 ? 2 : 1 ))]}'
PS2='%F{#837d88}... %f'
