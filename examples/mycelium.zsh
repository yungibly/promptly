# Promptly / standalone generative zsh prompt
# Recipe: {"version":1,"seed":"first-contact/3","style":"mycelium","palette":"ember","complexity":5,"glyphs":"unicode","label":"finn"}
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
  '%F{#b3d4c1}>%f%b%k'
  '%F{#b3d4c1}> %f%b%k'
  '%F{#efb779}╭─ finn  %F{#6d5556}${(l:(_promptly_w-6)-(9)::·:)}   %F{#df8d9e}⟨◈⟩%f%b%k
%F{#9b7570}╰─ %F{#b3d4c1}◈ %f%b%k'
  '  %F{#efb779}· finn ·${(l:(_promptly_w-13)-(10):: :)}%F{#df8d9e}⌁ undertow ⌁%f%b%k
 %F{#9b7570}╭${(l:(212*(_promptly_w-1)/1000)-(2)::─:)}╮${(l:(303*(_promptly_w-1)/1000)-(212*(_promptly_w-1)/1000+1):: :)}%F{#df8d9e}╷${(l:(416*(_promptly_w-1)/1000)-(303*(_promptly_w-1)/1000+1):: :)}%F{#6d5556}⋰·${(l:(637*(_promptly_w-1)/1000)-(416*(_promptly_w-1)/1000+2):: :)}%F{#df8d9e}⋰·${(l:(715*(_promptly_w-1)/1000)-(637*(_promptly_w-1)/1000+2):: :)}%F{#9b7570}╭${(l:(_promptly_w-2)-(715*(_promptly_w-1)/1000+1)::─:)}╮%f%b%k
 %F{#9b7570}│${(l:(212*(_promptly_w-1)/1000)-(2):: :)}╰${(l:(303*(_promptly_w-1)/1000)-(212*(_promptly_w-1)/1000+1)::─:)}┴${(l:(350*(_promptly_w-1)/1000)-(303*(_promptly_w-1)/1000+1)::─:)}┬${(l:(391*(_promptly_w-1)/1000)-(350*(_promptly_w-1)/1000+1)::─:)}┬${(l:(416*(_promptly_w-1)/1000)-(391*(_promptly_w-1)/1000+1)::─:)}┴${(l:(479*(_promptly_w-1)/1000)-(416*(_promptly_w-1)/1000+1)::─:)}┬${(l:(550*(_promptly_w-1)/1000-3)-(479*(_promptly_w-1)/1000+1)::─:)}%F{#b3d4c1} ∘ ⊕ ∘ %F{#9b7570}${(l:(637*(_promptly_w-1)/1000)-(550*(_promptly_w-1)/1000+4)::─:)}┴${(l:(715*(_promptly_w-1)/1000)-(637*(_promptly_w-1)/1000+1)::─:)}╯${(l:(_promptly_w-2)-(715*(_promptly_w-1)/1000+1):: :)}╵%f%b%k
 %F{#9b7570}├%F{#6d5556}${(l:(350*(_promptly_w-1)/1000)-(2)::┄:)}╲·${(l:(391*(_promptly_w-1)/1000)-(350*(_promptly_w-1)/1000+2)::┄:)}╯${(l:(479*(_promptly_w-1)/1000)-(391*(_promptly_w-1)/1000+1):: :)}%F{#df8d9e}╵${(l:(850*(_promptly_w-1)/1000)-(479*(_promptly_w-1)/1000+1):: :)}%F{#efb779}⋰  ◇%f%b%k
 %F{#9b7570}│${(l:(260*(_promptly_w-1)/1000)-(2):: :)}%F{#6d5556}·  ∘${(l:(580*(_promptly_w-1)/1000-3)-(260*(_promptly_w-1)/1000+4):: :)}%F{#df8d9e}◌ ᚲ ᚠ ◌%f%b%k
 %F{#9b7570}╰⌁ %F{#efb779}▹ %f%b%k'
)
typeset -ga _promptly_rights=( '' '%F{#9b7570}· ∘ ·%f' )

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
PROMPT='${(e)_promptly_frames[$((_promptly_w=(${COLUMNS:-80}<2?1:${COLUMNS:-80}>1001?1000:${COLUMNS:-80}-1),_promptly_w<=1?1:_promptly_w<=26?2:_promptly_w<=78?3:4))]}'
RPROMPT='${_promptly_rights[$(( ${COLUMNS:-80} >= 80 ? 2 : 1 ))]}'
PS2='%F{#9b7570}... %f'
