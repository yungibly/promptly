# Promptly / standalone generative zsh prompt
# Recipe: {"version":1,"seed":"first-contact/5","style":"xenoweave","palette":"phosphor","complexity":5,"glyphs":"unicode","label":"finn"}
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
  ' %F{#779197}│${(l:(190*(_promptly_w-1)/1000-2)-(2):: :)}%F{#bf91f3}⟦ ◇ ⟧${(l:(338*(_promptly_w-1)/1000-2)-(190*(_promptly_w-1)/1000+3):: :)}%F{#81efc5}· ⊙ ·${(l:(505*(_promptly_w-1)/1000-2)-(338*(_promptly_w-1)/1000+3):: :)}%F{#bf91f3}╭─◈─╮${(l:(671*(_promptly_w-1)/1000-2)-(505*(_promptly_w-1)/1000+3):: :)}%F{#81efc5}· ⊙ ·${(l:(839*(_promptly_w-1)/1000-2)-(671*(_promptly_w-1)/1000+3):: :)}%F{#bf91f3}⟦ ◇ ⟧${(l:(_promptly_w-1)-(839*(_promptly_w-1)/1000+3):: :)}%F{#779197}│%f%b%k'
  ' %F{#779197}├${(l:(190*(_promptly_w-1)/1000-1)-(2)::─:)}%F{#bf91f3}╮ ╭%F{#536573}${(l:(338*(_promptly_w-1)/1000-1)-(190*(_promptly_w-1)/1000+2)::─:)}%F{#81efc5}╮ ╭%F{#779197}${(l:(505*(_promptly_w-1)/1000-1)-(338*(_promptly_w-1)/1000+2)::─:)}%F{#bf91f3}╮ ╭%F{#536573}${(l:(671*(_promptly_w-1)/1000-1)-(505*(_promptly_w-1)/1000+2)::─:)}%F{#81efc5}╮ ╭%F{#779197}${(l:(839*(_promptly_w-1)/1000-1)-(671*(_promptly_w-1)/1000+2)::─:)}%F{#bf91f3}╮ ╭%F{#536573}${(l:(_promptly_w-1)-(839*(_promptly_w-1)/1000+2)::─:)}%F{#779197}┤%f%b%k'
  ' %F{#bf91f3}╞%F{#536573}${(l:(190*(_promptly_w-1)/1000-1)-(2)::·:)}%F{#e9ed9a} ╳ %F{#536573}${(l:(264*(_promptly_w-1)/1000-2)-(190*(_promptly_w-1)/1000+2)::·:)}%F{#81efc5} ⟨ᛖ⟩ %F{#536573}${(l:(338*(_promptly_w-1)/1000-1)-(264*(_promptly_w-1)/1000+3)::·:)}%F{#e9ed9a} ╳ %F{#536573}${(l:(421*(_promptly_w-1)/1000-2)-(338*(_promptly_w-1)/1000+2)::·:)}%F{#81efc5} ⟨ᛊ⟩ %F{#536573}${(l:(505*(_promptly_w-1)/1000-1)-(421*(_promptly_w-1)/1000+3)::·:)}%F{#e9ed9a} ╳ %F{#536573}${(l:(588*(_promptly_w-1)/1000-2)-(505*(_promptly_w-1)/1000+2)::·:)}%F{#81efc5} ⟨ᛊ⟩ %F{#536573}${(l:(671*(_promptly_w-1)/1000-1)-(588*(_promptly_w-1)/1000+3)::·:)}%F{#e9ed9a} ╳ %F{#536573}${(l:(755*(_promptly_w-1)/1000-2)-(671*(_promptly_w-1)/1000+2)::·:)}%F{#81efc5} ⟨ᛜ⟩ %F{#536573}${(l:(839*(_promptly_w-1)/1000-1)-(755*(_promptly_w-1)/1000+3)::·:)}%F{#e9ed9a} ╳ %F{#536573}${(l:(_promptly_w-1)-(839*(_promptly_w-1)/1000+2)::·:)}%F{#bf91f3}╡%f%b%k'
  ' %F{#779197}├%F{#536573}${(l:(190*(_promptly_w-1)/1000-1)-(2)::─:)}%F{#bf91f3}╯ ╰%F{#779197}${(l:(338*(_promptly_w-1)/1000-1)-(190*(_promptly_w-1)/1000+2)::─:)}%F{#81efc5}╯ ╰%F{#536573}${(l:(505*(_promptly_w-1)/1000-1)-(338*(_promptly_w-1)/1000+2)::─:)}%F{#bf91f3}╯ ╰%F{#779197}${(l:(671*(_promptly_w-1)/1000-1)-(505*(_promptly_w-1)/1000+2)::─:)}%F{#81efc5}╯ ╰%F{#536573}${(l:(839*(_promptly_w-1)/1000-1)-(671*(_promptly_w-1)/1000+2)::─:)}%F{#bf91f3}╯ ╰%F{#779197}${(l:(_promptly_w-1)-(839*(_promptly_w-1)/1000+2)::─:)}┤%f%b%k'
  ' %F{#779197}│${(l:(190*(_promptly_w-1)/1000-2)-(2):: :)}%F{#bf91f3}╵ ᚨ ╵${(l:(264*(_promptly_w-1)/1000)-(190*(_promptly_w-1)/1000+3):: :)}%F{#536573}⌁${(l:(338*(_promptly_w-1)/1000-2)-(264*(_promptly_w-1)/1000+1):: :)}%F{#81efc5}╵ ᛜ ╵${(l:(421*(_promptly_w-1)/1000)-(338*(_promptly_w-1)/1000+3):: :)}%F{#536573}⌁${(l:(505*(_promptly_w-1)/1000-2)-(421*(_promptly_w-1)/1000+1):: :)}%F{#bf91f3}╵ ᚾ ╵${(l:(588*(_promptly_w-1)/1000)-(505*(_promptly_w-1)/1000+3):: :)}%F{#536573}⌁${(l:(671*(_promptly_w-1)/1000-2)-(588*(_promptly_w-1)/1000+1):: :)}%F{#81efc5}╵ ᚺ ╵${(l:(755*(_promptly_w-1)/1000)-(671*(_promptly_w-1)/1000+3):: :)}%F{#536573}⌁${(l:(839*(_promptly_w-1)/1000-2)-(755*(_promptly_w-1)/1000+1):: :)}%F{#bf91f3}╵ ᛏ ╵${(l:(_promptly_w-1)-(839*(_promptly_w-1)/1000+3):: :)}%F{#779197}╵%f%b%k'
)
typeset -ga _promptly_frames=(
  '%F{#e9ed9a}>%f%b%k'
  '%F{#e9ed9a}> %f%b%k'
  '%F{#81efc5}╭─ finn  %F{#536573}${(l:(_promptly_w-6)-(9)::·:)}   %F{#bf91f3}⟨◈⟩%f%b%k
%F{#779197}╰─ %F{#e9ed9a}◈ %f%b%k'
  ' %F{#81efc5}╭─⟨ finn ⟩${(l:(_promptly_w-13)-(11):: :)}%F{#bf91f3}⟨ NULL:A0 ⟩─╮%f%b%k
${(e)_promptly_rows[1]}
${(e)_promptly_rows[2]}
${(e)_promptly_rows[3]}
${(e)_promptly_rows[4]}
${(e)_promptly_rows[5]}
 %F{#779197}╰─⟨%F{#e9ed9a}◈%F{#779197}⟩ %f%b%k'
  ' %F{#81efc5}╭─⟨ finn ⟩${(l:(264*(_promptly_w-1)/1000-2)-(11):: :)}%F{#536573}· ◇ ·${(l:(421*(_promptly_w-1)/1000-2)-(264*(_promptly_w-1)/1000+3):: :)}· ◇ ·${(l:(588*(_promptly_w-1)/1000-2)-(421*(_promptly_w-1)/1000+3):: :)}· ◇ ·${(l:(755*(_promptly_w-1)/1000-2)-(588*(_promptly_w-1)/1000+3):: :)}· ◇ ·${(l:(_promptly_w-13)-(755*(_promptly_w-1)/1000+3):: :)}%F{#bf91f3}⟨ NULL:A0 ⟩─╮%f%b%k
${(e)_promptly_rows[1]}
${(e)_promptly_rows[2]}
${(e)_promptly_rows[3]}
${(e)_promptly_rows[4]}
${(e)_promptly_rows[5]}
 %F{#779197}╰─⟨%F{#e9ed9a}◈%F{#779197}⟩ %f%b%k'
)
typeset -ga _promptly_rights=( '' '%F{#779197}╵ ⟨ ◈ ⟩ ╵%f' )

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
PROMPT='${(e)_promptly_frames[$((_promptly_w=(${COLUMNS:-80}<2?1:${COLUMNS:-80}>1001?1000:${COLUMNS:-80}-1),_promptly_w<=1?1:_promptly_w<=26?2:_promptly_w<=78?3:_promptly_w<=99?4:5))]}'
RPROMPT='${_promptly_rights[$(( ${COLUMNS:-80} >= 80 ? 2 : 1 ))]}'
PS2='%F{#779197}... %f'
