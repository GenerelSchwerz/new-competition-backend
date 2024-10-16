
#!/bin/bash
# a=0
# for i in maze*.png; do
#   new=$(printf "maze%03d.png" "$a")  # Renames to maze001.png, maze002.png, etc.
#   mv -- "$i" "$new"
#   let a=a+1
# done

rm aa.mp4
ffmpeg -framerate 5 -i 'maze%09d.png' -r 30 -vf "fps=30,scale=1280:720" -pix_fmt yuv420p aa.mp4
