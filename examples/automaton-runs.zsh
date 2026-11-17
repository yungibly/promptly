# Promptly / standalone generative zsh prompt
# Recipe: {"version":8,"seed":"tall/3","style":"compose","palette":"generated","complexity":3,"glyphs":"unicode","label":"","info":true,"material":"dashed","alphabet":"granular","symmetry":"none","height":6,"density":0.52,"ornamentSeed":"tall/3","engine":"automaton","spread":0.774,"fragments":3,"connectivity":0.924,"weight":0.874,"artSeed":"tall/3","layoutSeed":"tall/3","roleSeed":"tall/3","motifSeed":"tall/3","interactionSeed":"tall/3","fragmentSeeds":{},"colorSeed":"tall/3","colors":["#876269","#a96e86","#ff8ea6","#ff975c","#ff94c2","#f4e2e5","#260916"],"colorProgram":{"generator":"chromatic-relationships/1","space":"oklch","baseHue":7.049945,"hueSpread":41.786289,"balance":-0.317791,"chroma":0.202233,"lightness":0.790295,"lightnessSpread":0.035653,"referenceBackground":"#242733","surfaceIndex":6,"roles":[{"role":"quiet","lightness":0.536891,"chroma":0.048536,"hue":7.049945,"hex":"#876269"},{"role":"line","lightness":0.607544,"chroma":0.080893,"hue":353.770638,"hex":"#a96e86"},{"role":"accent1","lightness":0.774682,"chroma":0.138033,"hue":7.049945,"hex":"#ff8ea6"},{"role":"accent2","lightness":0.773583,"chroma":0.145746,"hue":48.836234,"hex":"#ff975c"},{"role":"accent3","lightness":0.792198,"chroma":0.137616,"hue":353.770638,"hex":"#ff94c2"},{"role":"text","lightness":0.927598,"chroma":0.020223,"hue":7.049945,"hex":"#f4e2e5"},{"role":"surface","lightness":0.193853,"chroma":0.052536,"hue":353.770638,"hex":"#260916"}]}}
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
  '%F{#ff94c2}>%f%b%k'
  '%F{#ff94c2}> %f%b%k'
  '%F{#ff8ea6}%8>..>%n%>>%F{#876269} / %F{#ff975c}%16<..<%~%<<%f%b%k
%F{#ff94c2}› %f%b%k'
  '  %F{#ff975c}%17<..<%~%<< %F{#f4e2e5}%8>..>%n%>>%f%b%k
         %F{#ffbab1}▄%K{#ffbab1} %k            ▄%K{#ffbab1} %f%b%k
       %F{#ffa078}▄%K{#ffa078} %k▀%K{#ffa078} %k          ▄%K{#ffa078} %k▀%K{#ffa078} %f%b%k
     %F{#d87ba2}▄%K{#d87ba2}%F{#ff9695}▀%k▀▀▀%K{#d87ba2}▀%k        %F{#d87ba2}▄%K{#d87ba2}%F{#ff9695}▀%k▀▀▀%K{#d87ba2}▀%f%b%k
   %F{#6a344b}▄%K{#6a344b}%F{#d87ba2}▀%k▀%K{#6a344b}▀%k %F{#6a344b}▄%K{#6a344b}%F{#d87ba2}▀▀%k      %F{#6a344b}▄%K{#6a344b}%F{#d87ba2}▀%k▀%K{#6a344b}▀%k %F{#6a344b}▄%K{#6a344b}%F{#d87ba2}▀▀%f%b%k
 %F{#ff94c2}› %f%b%k'
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
PS2='%F{#a96e86}... %f'
