from rest_framework.decorators import api_view
from rest_framework. response import Response
from rest_framework import status


from . models import Date
from .serializers import DateSerializer


@api_view(['GET', 'POST'])
def dates_list(request):
    if request.method == 'POST':
        serializer = DateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    cats = Date.objects.all()
    serializer = DateSerializer(cats, many=True)
    return Response(serializer.data)


def index(request):
    return HttpResponse('Апи работает')

