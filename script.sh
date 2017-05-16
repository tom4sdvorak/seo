escape=`printf "\e"`

ruby=`ruby -v`
val="$?"
if [ $val -eq 127 ] ; then
	echo "FAIL:  Ruby not installed. Please install it."
	exit 1
else

	version=`echo $ruby | grep -o 'ruby .\..' | grep -o '.\..'`
	correct=`echo "$version >= 2.1" | bc`
 
	if [ $correct -eq 0 ] ; then
		echo "FAIL: Your Ruby version is too low ( >= 2.1 is needed)"
		exit 1
	else
		echo "$escape[01;32mOK:$escape[00m Ruby version is installed at version ($version) ( >= 2.1 is needed)"
	fi
fi

gem=`gem -v`
val="$?"

if [ $val -eq 127 ] ; then
	echo "FAIL: RubyGems not installed. Please install it."
	exit 1
else
	version=`gem -v`
	echo "$escape[01;32mOK:$escape[00m RubyGems is installed at version $version"
fi


node=`node -v` # won't work on Linux
val="$?"
if [ $val -eq 127 ] ; then
	echo "FAIL: Node.js not installed. Please install it."
	exit 1
else
	version=`node -v | tr -d 'v'`
	echo "$escape[01;32mOK:$escape[00m Node.js is installed at version $version"
fi

npm=`npm -v`
val="$?"
if [ $val -eq 127 ] ; then
	echo "FAIL: npm not installed. Please install it."
	exit 1
else
	version=`npm -v | tr -d 'v'`
	echo "$escape[01;32mOK:$escape[00m npm is installed at version $version"
fi

if [ $val -eq 0 ] ; then
	echo "$escape[01;32mOK:$escape[00m The pdf-reader gem is installed."
else
	echo "FAIL: The pdf-reader gem is not installed. Please install it. (or RubyGems is unreachable)"
	echo "Trying to install:"
	gem install pdf-reader || exit 1
fi
echo "Installing dependencies via npm."
echo "$escape[01;32mALL DONE!$escape[00m"

node bin/www &
sleep 2
open "http://localhost:3000"