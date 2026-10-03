# Promptly / standalone generative zsh prompt
# Recipe: {"version":1,"seed":"first-contact/2","style":"reliquary","palette":"ultraviolet","complexity":5,"glyphs":"unicode","label":"finn"}
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
typeset -g _promptly_text1='⟦ UNDERTOW / 48 ⟧╮'
typeset -g _promptly_text2='·  ╷  ·'
typeset -ga _promptly_rows=(
  ' %F{#b7a1ff}╭⟦ finn ⟧${(l:(220*(_promptly_w-1)/1000-3)-(10):: :)}%F{#5c536f}·  ╷  ·${(l:(462*(_promptly_w-1)/1000)-(220*(_promptly_w-1)/1000+4):: :)}%F{#ef98ca}◇${(l:(800*(_promptly_w-1)/1000-3)-(462*(_promptly_w-1)/1000+1):: :)}%F{#5c536f}·  ╷  ·%F{#7ee4ef}${${(pr:((_promptly_w)-(800*(_promptly_w-1)/1000+4))+((((800*(_promptly_w-1)/1000+4)-(_promptly_w-18))%18+18)%18)::$_promptly_text1:)}:((((800*(_promptly_w-1)/1000+4)-(_promptly_w-18))%18+18)%18):((_promptly_w)-(800*(_promptly_w-1)/1000+4))}%f%b%k'
  ' %F{#8c77a5}╞%F{#5c536f}${(l:(220*(_promptly_w-1)/1000-5)-(2)::═:)}%F{#b7a1ff} ⟦ ᛜ ᛟ ᚱ ⟧ %F{#5c536f}${(l:(462*(_promptly_w-1)/1000-6)-(220*(_promptly_w-1)/1000+6)::═:)}%F{#7ee4ef}╪═╡ ⟨ ◈ ⟩ ╞═╪%F{#5c536f}${(l:(800*(_promptly_w-1)/1000-5)-(462*(_promptly_w-1)/1000+7)::═:)}%F{#b7a1ff} ⟦ ᛟ ᛉ ᚱ ⟧ %F{#5c536f}${(l:(_promptly_w-1)-(800*(_promptly_w-1)/1000+6)::═:)}%F{#8c77a5}╡%f%b%k'
  ' %F{#8c77a5}│${(l:(220*(_promptly_w-1)/1000-3)-(2):: :)}%F{#7ee4ef}╵  ⋮  ╵${(l:(462*(_promptly_w-1)/1000-5)-(220*(_promptly_w-1)/1000+4):: :)}%F{#8c77a5}╯  ╲ ◇ ╱  ╰${(l:(800*(_promptly_w-1)/1000-3)-(462*(_promptly_w-1)/1000+6):: :)}%F{#7ee4ef}╵  ⋮  ╵${(l:(_promptly_w-1)-(800*(_promptly_w-1)/1000+4):: :)}%F{#8c77a5}╵%f%b%k'
  ' %F{#8c77a5}│${(l:(300*(_promptly_w-1)/1000)-(2):: :)}╰%F{#5c536f}${(l:(462*(_promptly_w-1)/1000-3)-(300*(_promptly_w-1)/1000+1)::┄:)}   %F{#ef98ca}▿   %F{#5c536f}${(l:(720*(_promptly_w-1)/1000)-(462*(_promptly_w-1)/1000+4)::┄:)}%F{#8c77a5}╯%f%b%k'
  ' %F{#8c77a5}│%F{#5c536f}${(l:(100*(_promptly_w-1)/1000-1)-(2)::─:)}%F{#7ee4ef} ╳ %F{#5c536f}${(l:(220*(_promptly_w-1)/1000)-(100*(_promptly_w-1)/1000+2)::─:)}%F{#8c77a5}┴%F{#5c536f}${(l:(462*(_promptly_w-1)/1000-5)-(220*(_promptly_w-1)/1000+1)::─:)}%F{#8c77a5}╮  ╱ ◇ ╲  ╭%F{#5c536f}${(l:(800*(_promptly_w-1)/1000)-(462*(_promptly_w-1)/1000+6)::─:)}%F{#8c77a5}┴%F{#5c536f}${(l:(910*(_promptly_w-1)/1000-1)-(800*(_promptly_w-1)/1000+1)::─:)}%F{#7ee4ef} ╳ %F{#5c536f}${(l:(_promptly_w-1)-(910*(_promptly_w-1)/1000+2)::─:)}%F{#8c77a5}│%f%b%k'
)
typeset -ga _promptly_frames=(
  '%F{#ef98ca}>%f%b%k'
  '%F{#ef98ca}> %f%b%k'
  '%F{#b7a1ff}╭─ finn  %F{#5c536f}${(l:(_promptly_w-6)-(9)::·:)}   %F{#7ee4ef}⟨◈⟩%f%b%k
%F{#8c77a5}╰─ %F{#ef98ca}◈ %f%b%k'
  '${(e)_promptly_rows[1]}
 %F{#8c77a5}│%F{#5c536f}${(l:(220*(_promptly_w-1)/1000)-(2)::─:)}%F{#8c77a5}┴%F{#5c536f}${(l:(462*(_promptly_w-1)/1000-5)-(220*(_promptly_w-1)/1000+1)::─:)}%F{#8c77a5}╮  ╱ ◇ ╲  ╭%F{#5c536f}${(l:(800*(_promptly_w-1)/1000)-(462*(_promptly_w-1)/1000+6)::─:)}%F{#8c77a5}┴%F{#5c536f}${(l:(_promptly_w-1)-(800*(_promptly_w-1)/1000+1)::─:)}%F{#8c77a5}│%f%b%k
${(e)_promptly_rows[2]}
${(e)_promptly_rows[3]}
${(e)_promptly_rows[4]}
 %F{#8c77a5}╰─╼ %F{#ef98ca}◇ %f%b%k'
  '${(e)_promptly_rows[1]}
${(e)_promptly_rows[5]}
${(e)_promptly_rows[2]}
${(e)_promptly_rows[3]}
${(e)_promptly_rows[4]}
 %F{#8c77a5}╰─╼ %F{#ef98ca}◇ %f%b%k'
  ' %F{#b7a1ff}╭⟦ finn ⟧${(l:(220*(_promptly_w-1)/1000-3)-(10):: :)}%F{#5c536f}·  ╷  ·${(l:(462*(_promptly_w-1)/1000)-(220*(_promptly_w-1)/1000+4):: :)}%F{#ef98ca}◇${(l:(800*(_promptly_w-1)/1000-3)-(462*(_promptly_w-1)/1000+1):: :)}%F{#5c536f}${${(pr:((_promptly_w-18)-(800*(_promptly_w-1)/1000-3))+(((0)%7+7)%7)::$_promptly_text2:)}:(((0)%7+7)%7):((_promptly_w-18)-(800*(_promptly_w-1)/1000-3))}%F{#7ee4ef}⟦ UNDERTOW / 48 ⟧╮%f%b%k
${(e)_promptly_rows[5]}
${(e)_promptly_rows[2]}
${(e)_promptly_rows[3]}
${(e)_promptly_rows[4]}
 %F{#8c77a5}╰─╼ %F{#ef98ca}◇ %f%b%k'
  ' %F{#b7a1ff}╭⟦ finn ⟧${(l:(220*(_promptly_w-1)/1000-3)-(10):: :)}%F{#5c536f}·  ╷  ·${(l:(462*(_promptly_w-1)/1000)-(220*(_promptly_w-1)/1000+4):: :)}%F{#ef98ca}◇${(l:(800*(_promptly_w-1)/1000-3)-(462*(_promptly_w-1)/1000+1):: :)}%F{#5c536f}·  ╷  ·${(l:(_promptly_w-18)-(800*(_promptly_w-1)/1000+4):: :)}%F{#7ee4ef}⟦ UNDERTOW / 48 ⟧╮%f%b%k
${(e)_promptly_rows[5]}
${(e)_promptly_rows[2]}
${(e)_promptly_rows[3]}
${(e)_promptly_rows[4]}
 %F{#8c77a5}╰─╼ %F{#ef98ca}◇ %f%b%k'
)
typeset -ga _promptly_rights=( '' '%F{#8c77a5}╵ ◇ ╵%f' )

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
PROMPT='${(e)_promptly_frames[$((_promptly_w=(${COLUMNS:-80}<2?1:${COLUMNS:-80}>1001?1000:${COLUMNS:-80}-1),_promptly_w<=1?1:_promptly_w<=26?2:_promptly_w<=78?3:_promptly_w<=99?4:_promptly_w<=101?5:_promptly_w<=106?6:7))]}'
RPROMPT='${_promptly_rights[$(( ${COLUMNS:-80} >= 80 ? 2 : 1 ))]}'
PS2='%F{#8c77a5}... %f'
