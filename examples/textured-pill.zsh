# Promptly / standalone generative zsh prompt
# Recipe: {"version":8,"seed":"paper-kite/13","style":"compose","palette":"generated","complexity":1,"glyphs":"unicode","label":"","info":true,"material":"double","alphabet":"geometric","symmetry":"none","height":1,"density":0.392,"ornamentSeed":"paper-kite/13","engine":"surface","spread":0.911,"fragments":1,"connectivity":0,"weight":0.54,"artSeed":"paper-kite/13","layoutSeed":"paper-kite/13","roleSeed":"paper-kite/13","motifSeed":"paper-kite/13","interactionSeed":"paper-kite/13","fragmentSeeds":{},"colorSeed":"paper-kite/13","colors":["#517278","#4c867c","#00c2db","#a193f8","#00d5bd","#d4e2e5","#00231e"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":211.088772,"hueSpread":77.606783,"balance":-0.388096,"chroma":0.160246,"lightness":0.746902,"lightnessSpread":0.124618,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.529144,"chroma":0.038459,"hue":211.088772,"hex":"#517278"},{"role":"line","lightness":0.577707,"chroma":0.064098,"hue":180.96989,"hex":"#4c867c"},{"role":"accent1","lightness":0.745196,"chroma":0.129381,"hue":211.088772,"hex":"#00c2db"},{"role":"accent2","lightness":0.716403,"chroma":0.144265,"hue":288.695555,"hex":"#a193f8"},{"role":"accent3","lightness":0.783303,"chroma":0.141213,"hue":180.96989,"hex":"#00d5bd"},{"role":"text","lightness":0.903738,"chroma":0.016025,"hue":211.088772,"hex":"#d4e2e5"},{"role":"surface","lightness":0.229496,"chroma":0.041373,"hue":180.96989,"hex":"#00231e"}]}}
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
  '%F{#00d5bd}>%f%b%k'
  '%F{#00d5bd}> %f%b%k'
  '%F{#00c2db}%8>..>%n%>>%F{#517278} / %F{#a193f8}%16<..<%~%<<%f%b%k
%F{#00d5bd}› %f%b%k'
  '  %F{#00231e}▐%K{#00231e}%F{#00c2db} %8>..>%n%>>%K{#a193f8}%F{#000000} %19<..<%~%<< %k  %11(l..%k%F{#4fb2f7}▇)%12(l..%k%F{#4fb2f7}▇)%13(l..%K{#6ea8fd}%F{#6ea8fd} )%14(l..%K{#6ea8fd}%F{#6ea8fd} )%15(l..%K{#6ea8fd}%F{#6ea8fd} )%16(l..%K{#899efe}%F{#899efe} )%17(l..%K{#899efe}%F{#899efe} )%18(l..%K{#899efe}%F{#899efe} )%19(l..%K{#a193f8}%F{#a193f8} )%20(l..%K{#a193f8}%F{#a193f8} )%21(l..%K{#a193f8}%F{#a193f8} )%22(l..%K{#81a4ff}%F{#81a4ff} )%23(l..%K{#81a4ff}%F{#81a4ff} )%24(l..%K{#81a4ff}%F{#81a4ff} )%25(l..%K{#55b3ff}%F{#55b3ff} )%26(l..%K{#55b3ff}%F{#55b3ff} )%27(l..%K{#55b3ff}%F{#55b3ff} )%28(l..%K{#00c2f2}%F{#00c2f2} )%29(l..%K{#00c2f2}%F{#00c2f2} )%30(l..%K{#00c2f2}%F{#00c2f2} )%31(l..%K{#00ccd8}%F{#00ccd8} )%32(l..%K{#00ccd8}%F{#00ccd8} )%33(l..%K{#00ccd8}%F{#00ccd8} )%34(l..%K{#00d5bd}%F{#00d5bd} )%35(l..%K{#00d5bd}%F{#00d5bd} )%36(l..%K{#00d5bd}%F{#00d5bd} )%k%F{#00d5bd}▸ %f%b%k'
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
PS2='%F{#4c867c}... %f'
