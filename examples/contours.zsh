# Promptly / standalone generative zsh prompt
# Recipe: {"version":8,"seed":"tall/2","style":"compose","palette":"generated","complexity":6,"glyphs":"unicode","label":"","info":true,"material":"square","alphabet":"geometric","symmetry":"none","height":6,"density":0.35,"ornamentSeed":"tall/2","engine":"tiles","spread":0.902,"fragments":3,"connectivity":0.983,"weight":0.682,"artSeed":"tall/2","layoutSeed":"tall/2","roleSeed":"tall/2","motifSeed":"tall/2","interactionSeed":"tall/2","fragmentSeeds":{},"colorSeed":"tall/2","colors":["#686969","#797b7b","#bcc0c1","#c1bdbf","#c0c5c7","#e5e6e6","#202325"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":212.254608,"hueSpread":141.18812,"balance":0.062605,"chroma":0.005454,"lightness":0.803492,"lightnessSpread":0.035212,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.520859,"chroma":0.001309,"hue":212.254608,"hex":"#686969"},{"role":"line","lightness":0.58064,"chroma":0.002182,"hue":221.09369,"hex":"#797b7b"},{"role":"accent1","lightness":0.804438,"chroma":0.004649,"hue":212.254608,"hex":"#bcc0c1"},{"role":"accent2","lightness":0.802208,"chroma":0.005324,"hue":353.442728,"hex":"#c1bdbf"},{"role":"accent3","lightness":0.819831,"chroma":0.005802,"hue":221.09369,"hex":"#c0c5c7"},{"role":"text","lightness":0.92407,"chroma":0.000545,"hue":212.254608,"hex":"#e5e6e6"},{"role":"surface","lightness":0.254933,"chroma":0.005309,"hue":221.09369,"hex":"#202325"}]}}
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
  '%F{#c0c5c7}>%f%b%k'
  '%F{#c0c5c7}> %f%b%k'
  '%F{#bcc0c1}%8>..>%n%>>%F{#686969} / %F{#c1bdbf}%16<..<%~%<<%f%b%k
%F{#c0c5c7}› %f%b%k'
  '${(l:(500*(_promptly_w-1)/1000-6)-(0):: :)}%F{#a0a4a5}╭%F{#c0c4c4}┼╯%F{#d0d3d3}╭──────────────────────────────────╮%F{#c0c4c4}╰┼%f%b%k
${(l:(500*(_promptly_w-1)/1000-11)-(0):: :)}%F{#a0a4a5}╭────%F{#c1bebf}┼%F{#c0c4c4}┤ %F{#d0d3d3}│  %F{#e5e6e6}%20<..<%~%<< %F{#c0c5c7}%8>..>%n%>>%$(( 500*(_promptly_w-1)/1000+4 ))(l.. )%$(( 500*(_promptly_w-1)/1000+5 ))(l.. )%$(( 500*(_promptly_w-1)/1000+6 ))(l.. )%$(( 500*(_promptly_w-1)/1000+7 ))(l.. )%$(( 500*(_promptly_w-1)/1000+8 ))(l.. )%$(( 500*(_promptly_w-1)/1000+9 ))(l.. )%$(( 500*(_promptly_w-1)/1000+10 ))(l.. )%$(( 500*(_promptly_w-1)/1000+11 ))(l.. )%$(( 500*(_promptly_w-1)/1000+12 ))(l.. )%$(( 500*(_promptly_w-1)/1000+13 ))(l.. )%$(( 500*(_promptly_w-1)/1000+14 ))(l.. )%$(( 500*(_promptly_w-1)/1000+15 ))(l.. )%$(( 500*(_promptly_w-1)/1000+16 ))(l.. )%$(( 500*(_promptly_w-1)/1000+17 ))(l.. )%$(( 500*(_promptly_w-1)/1000+18 ))(l.. )%$(( 500*(_promptly_w-1)/1000+19 ))(l.. )%$(( 500*(_promptly_w-1)/1000+20 ))(l.. )%$(( 500*(_promptly_w-1)/1000+21 ))(l.. )%$(( 500*(_promptly_w-1)/1000+22 ))(l.. )%$(( 500*(_promptly_w-1)/1000+23 ))(l.. )%$(( 500*(_promptly_w-1)/1000+24 ))(l.. )%$(( 500*(_promptly_w-1)/1000+25 ))(l.. )%$(( 500*(_promptly_w-1)/1000+26 ))(l.. )%$(( 500*(_promptly_w-1)/1000+27 ))(l.. )%$(( 500*(_promptly_w-1)/1000+28 ))(l.. )%$(( 500*(_promptly_w-1)/1000+29 ))(l.. )%$(( 500*(_promptly_w-1)/1000+30 ))(l.. )  %F{#d0d3d3}│ %F{#c0c4c4}│%f%b%k
${(l:(500*(_promptly_w-1)/1000-12)-(0):: :)}%F{#a0a4a5}╭╯    %F{#c1bebf}│%F{#c0c4c4}│ %F{#d0d3d3}╰──────────────────────────────────╯ %F{#c0c4c4}│%f%b%k
${(l:(500*(_promptly_w-1)/1000-14)-(0):: :)}%F{#a0a4a5}╭─╯  %F{#c1bebf}╭──╯%F{#c0c4c4}╰────╮                %F{#d0d3d3}╭────────────╮   %F{#c0c4c4}╰%f%b%k
${(l:(500*(_promptly_w-1)/1000-16)-(0):: :)}%F{#a0a4a5}╭─╯   %F{#c1bebf}╭╯        %F{#c0c4c4}╰────────╮      %F{#d0d3d3}╭╯            ╰───╮%f%b%k
 %F{#c0c5c7}› %f%b%k'
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
PROMPT='${(e)_promptly_frames[$((_promptly_w=(${COLUMNS:-80}<2?1:${COLUMNS:-80}>1001?1000:${COLUMNS:-80}-1),(_promptly_w<=26?(_promptly_w<=1?1:2):(_promptly_w<=78?3:4))))]}'
RPROMPT='${_promptly_rights[$(( ${COLUMNS:-80} >= 80 ? 2 : 1 ))]}'
PS2='%F{#797b7b}... %f'
