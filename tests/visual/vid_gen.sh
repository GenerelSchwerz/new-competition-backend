#!/bin/bash

# Create the output directory if it doesn't exist
mkdir -p vid_result

# Set the directory variable
dir="."  # Replace with the actual directory path

# Extract robot numbers from the file pattern {dir}/raw_imgs/maze{robot_num}_{ident}.png
robot_numbers=$(ls ${dir}/raw_imgs/maze*_*.png | awk -F'[/_]' '{gsub("maze", "", $4); print $4}' | sort -u)



# Loop through each unique robot number and generate a video
for robot_num in $robot_numbers
do

    # Ensure the robot number is padded to 3 digits
    padded_robot_num=$(printf "%03d" $robot_num)

    echo "Generating video for robot $padded_robot_num"

    rm -rf vid_result/robot${padded_robot_num}_output.mp4
    # Use ffmpeg to generate a video for each robot, output to the vid_result/ folder
    ffmpeg -framerate 30 -i raw_imgs/maze${padded_robot_num}_%09d.png -c:v libx264 -pix_fmt yuv420p vid_result/robot${padded_robot_num}_output.mp4

    echo "Generated video for robot $padded_robot_num in vid_result/"
done
