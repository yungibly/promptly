# Promptly / standalone generative zsh prompt
# Recipe: {"version":1,"seed":"first-contact/1","style":"signal","palette":"phosphor","complexity":3,"glyphs":"unicode","label":"finn"}
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
  '%F{#e9ed9a}>%f%b%k'
  '%F{#e9ed9a}> %f%b%k'
  '%F{#81efc5}╭─ finn  %F{#536573}${(l:(_promptly_w-6)-(9)::·:)}   %F{#bf91f3}⟨◈⟩%f%b%k
%F{#779197}╰─ %F{#e9ed9a}◈ %f%b%k'
  '%F{#779197}╭─%F{#536573}─%F{#81efc5}⟨⌬:finn⟩%F{#536573}${(l:(361*(_promptly_w-1)/1000)-(11)::─:)}%F{#779197}╮${(l:(730*(_promptly_w-1)/1000)-(361*(_promptly_w-1)/1000+1):: :)}╭%F{#536573}${(l:(_promptly_w-11)-(730*(_promptly_w-1)/1000+1)::·:)}%F{#bf91f3}⟦ NULL:50 ⟧%f%b%k
%F{#779197}│  %F{#bf91f3}ᚷ ᚠ ᚹ  ⌁  ◈${(l:(361*(_promptly_w-1)/1000)-(14):: :)}%F{#779197}╰%F{#536573}${(l:(540*(_promptly_w-1)/1000-4)-(361*(_promptly_w-1)/1000+1)::─:)}%F{#e9ed9a} ⊣ ᚨ ᛚ ⊢ %F{#536573}${(l:(730*(_promptly_w-1)/1000)-(540*(_promptly_w-1)/1000+5)::─:)}%F{#779197}┴%F{#536573}${(l:(_promptly_w-1)-(730*(_promptly_w-1)/1000+1)::─:)}%F{#779197}╯%f%b%k
%F{#779197}╰─ %F{#e9ed9a}◈ %f%b%k'
  '%F{#779197}╭─%F{#536573}─%F{#81efc5}⟨⌬:finn⟩%F{#536573}${(l:(230*(_promptly_w-1)/1000-3)-(11)::─:)}%F{#e9ed9a} ╴╴◈╶╶ %F{#536573}${(l:(361*(_promptly_w-1)/1000)-(230*(_promptly_w-1)/1000+4)::─:)}%F{#779197}╮${(l:(730*(_promptly_w-1)/1000)-(361*(_promptly_w-1)/1000+1):: :)}╭%F{#536573}${(l:(_promptly_w-11)-(730*(_promptly_w-1)/1000+1)::·:)}%F{#bf91f3}⟦ NULL:50 ⟧%f%b%k
%F{#779197}│  %F{#bf91f3}ᚷ ᚠ ᚹ  ⌁  ◈${(l:(361*(_promptly_w-1)/1000)-(14):: :)}%F{#779197}╰%F{#536573}${(l:(540*(_promptly_w-1)/1000-4)-(361*(_promptly_w-1)/1000+1)::─:)}%F{#e9ed9a} ⊣ ᚨ ᛚ ⊢ %F{#536573}${(l:(730*(_promptly_w-1)/1000)-(540*(_promptly_w-1)/1000+5)::─:)}%F{#779197}┴%F{#536573}${(l:(880*(_promptly_w-1)/1000-2)-(730*(_promptly_w-1)/1000+1)::─:)}%F{#bf91f3} ᛚ ᚲ %F{#536573}${(l:(_promptly_w-1)-(880*(_promptly_w-1)/1000+3)::─:)}%F{#779197}╯%f%b%k
%F{#779197}╰─ %F{#e9ed9a}◈ %f%b%k'
)
typeset -ga _promptly_rights=( '' '%F{#779197}⟨ · ⌬ · ⟩%f' )

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
