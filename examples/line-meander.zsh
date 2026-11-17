# Promptly / standalone generative zsh prompt
# Recipe: {"version":8,"seed":"first-light/12","style":"compose","palette":"generated","complexity":3,"glyphs":"unicode","label":"","info":true,"material":"double","alphabet":"geometric","symmetry":"none","height":3,"density":0.634,"ornamentSeed":"first-light/12","engine":"prompt","spread":0.775,"fragments":1,"connectivity":0.263,"weight":0.807,"artSeed":"first-light/12","layoutSeed":"first-light/12","roleSeed":"first-light/12","motifSeed":"first-light/12","interactionSeed":"first-light/12","fragmentSeeds":{},"colorSeed":"first-light/12","colors":["#6b6f6f","#85888c","#839192","#ad9ea3","#90979f","#edefef","#0f1215"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":203.735988,"hueSpread":152.60917,"balance":0.335138,"chroma":0.017964,"lightness":0.664951,"lightnessSpread":0.126859,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.537078,"chroma":0.004311,"hue":203.735988,"hex":"#6b6f6f"},{"role":"line","lightness":0.625289,"chroma":0.007186,"hue":254.88112,"hex":"#85888c"},{"role":"accent1","lightness":0.645063,"chroma":0.016094,"hue":203.735988,"hex":"#839192"},{"role":"accent2","lightness":0.714083,"chroma":0.017617,"hue":356.345158,"hex":"#ad9ea3"},{"role":"accent3","lightness":0.672269,"chroma":0.013985,"hue":254.88112,"hex":"#90979f"},{"role":"text","lightness":0.950209,"chroma":0.001796,"hue":203.735988,"hex":"#edefef"},{"role":"surface","lightness":0.180272,"chroma":0.008311,"hue":254.88112,"hex":"#0f1215"}]}}
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
  '%F{#90979f}>%f%b%k'
  '%F{#90979f}> %f%b%k'
  '%F{#839192}%8>..>%n%>>%F{#6b6f6f} / %F{#ad9ea3}%16<..<%~%<<%f%b%k
%F{#90979f}› %f%b%k'
  '  %F{#839191}──╮  %F{#8d9a9a}╭─╮   %F{#97a3a3}╭%F{#a2acac}───╮ %F{#acb5b5}╭─╮ %F{#b7bebe}╭──%F{#bec4c4}╮  ╭%F{#c1c7c7}──╮   %F{#c4caca}╭─%F{#c7cdcd}──╮  %F{#cacfcf}╭──%F{#cdd2d2}╮%f%b%k
  %F{#ad9ea3}%16<..<%~%<<%F{#90979f} / %F{#839192}%8>..>%n%>>%8(l..%k%F{#8d9a9a}╯)%9(l..%k )%10(l..%k%F{#8d9a9a}╰)%11(l..%k%F{#97a3a3}─)%12(l..%k%F{#97a3a3}─)%13(l..%k%F{#97a3a3}─)%14(l..%k%F{#97a3a3}╯)%15(l..%k )%16(l..%k )%17(l..%k )%18(l..%k%F{#a2acac}╰)%19(l..%k%F{#acb5b5}─)%20(l..%k%F{#acb5b5}╯)%21(l..%k )%22(l..%k%F{#acb5b5}╰)%23(l..%k%F{#b7bebe}─)%24(l..%k%F{#b7bebe}╯)%25(l..%k )%26(l..%k )%27(l..%k%F{#bec4c4}╰)%28(l..%k%F{#bec4c4}─)%29(l..%k%F{#bec4c4}─)%30(l..%k%F{#bec4c4}╯)%31(l..%k )%32(l..%k )%33(l..%k%F{#c1c7c7}╰)%34(l..%k%F{#c1c7c7}─)%35(l..%k%F{#c4caca}─)%36(l..%k%F{#c4caca}─)%37(l..%k%F{#c4caca}╯)%k   %F{#c7cdcd}╰─%F{#cacfcf}─╯  %F{#cdd2d2}╰──%f%b%k
%F{#90979f}› %f%b%k'
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
PS2='%F{#85888c}... %f'
